"""Create fictional evaluation records through the actual Frappe document API.

Run with the Bench virtualenv Python from the frappe-bench directory.
No email, payment, or external integration is configured.
"""
import datetime
import json
import os

import frappe
from frappe.utils import getdate


def ensure(doctype, filters, values):
    name = frappe.db.exists(doctype, filters)
    if name:
        return frappe.get_doc(doctype, name)
    return frappe.get_doc({"doctype": doctype, **values}).insert()


def seed():
    frappe.set_user("Administrator")
    frappe.flags.mute_emails = True
    company = "禾序演示工作室"
    if not frappe.db.exists("Company", company):
        from frappe.desk.page.setup_wizard.setup_wizard import setup_complete

        result = setup_complete({
            "currency": "CNY", "full_name": "HR 演示管理员", "company_name": company,
            "timezone": "Asia/Shanghai", "company_abbr": "HX", "industry": "Services",
            "country": "China", "fy_start_date": "2026-01-01", "fy_end_date": "2026-12-31",
            "language": "English", "company_tagline": "仅用于官方 HRMS 功能体验的虚拟公司",
            "email": "hr-demo@example.invalid", "password": os.environ["HRMS_ADMIN_PASSWORD"],
            "chart_of_accounts": "Standard",
        })
        print("Setup result:", result)
        frappe.db.commit()
    frappe.db.set_value("User", "Administrator", "language", "zh")
    frappe.db.set_single_value("System Settings", "language", "zh")
    frappe.db.set_single_value("System Settings", "time_zone", "Asia/Shanghai")
    frappe.db.set_single_value("HR Settings", "send_leave_notification", 0)
    frappe.db.set_single_value("Payroll Settings", "payroll_based_on", "Leave")

    holidays = []
    day = datetime.date(2026, 1, 1)
    while day.year == 2026:
        if day.weekday() >= 5:
            holidays.append({"holiday_date": str(day), "description": "演示周末", "weekly_off": 1})
        day += datetime.timedelta(days=1)
    holiday = ensure("Holiday List", "HX 2026 Demo Holidays", {
        "holiday_list_name": "HX 2026 Demo Holidays", "from_date": "2026-01-01", "to_date": "2026-12-31", "holidays": holidays,
    })
    frappe.db.set_value("Company", company, "default_holiday_list", holiday.name)
    if frappe.db.exists("DocType", "Holiday List Assignment"):
        assignment = ensure("Holiday List Assignment", {"assigned_to": company, "holiday_list": holiday.name}, {
            "holiday_list": holiday.name, "applicable_for": "Company", "assigned_to": company, "from_date": "2026-01-01",
        })
        if assignment.docstatus == 0:
            assignment.submit()
    staff = [
        ("林知夏", "产品设计", "产品设计师", 18000), ("陈屿", "研发中心", "前端工程师", 22000),
        ("周予安", "市场运营", "内容运营", 12000), ("许嘉宁", "研发中心", "后端工程师", 24000),
        ("宋一禾", "产品设计", "产品经理", 20000), ("陆远", "市场运营", "市场专员", 10000),
    ]
    people = []
    for name, department, role, salary in staff:
        dept = ensure("Department", {"department_name": department, "company": company}, {"department_name": department, "company": company})
        designation = ensure("Designation", role, {"designation_name": role})
        employee = ensure("Employee", {"employee_name": name, "company": company}, {
            "first_name": name, "employee_name": name, "company": company, "department": dept.name,
            "designation": designation.name, "date_of_joining": "2025-01-06", "date_of_birth": "1995-06-15",
            "gender": "Female" if name in ["林知夏", "许嘉宁", "宋一禾"] else "Male",
            "status": "Active", "holiday_list": holiday.name,
        })
        people.append((employee, salary))
    annual = ensure("Leave Type", "演示年假", {"leave_type_name": "演示年假", "include_holiday": 0})
    unpaid = ensure("Leave Type", "演示无薪假", {"leave_type_name": "演示无薪假", "is_lwp": 1, "include_holiday": 0})
    for employee, salary in people:
        allocation = ensure("Leave Allocation", {"employee": employee.name, "leave_type": annual.name, "docstatus": ["!=", 2]}, {
            "employee": employee.name, "company": company, "leave_type": annual.name,
            "from_date": "2026-01-01", "to_date": "2026-12-31", "new_leaves_allocated": 10,
        })
        if allocation.docstatus == 0:
            allocation.submit()
    for idx, leave_type, date, status, description in [
        (0, annual.name, "2026-09-23", "Open", "演示：待审批的年假申请"),
        (2, unpaid.name, "2026-09-16", "Approved", "演示：已批准无薪假，供真实薪资计算读取"),
        (5, annual.name, "2026-09-24", "Open", "演示：员工个人事务"),
    ]:
        leave = ensure("Leave Application", {"employee": people[idx][0].name, "description": description}, {
            "employee": people[idx][0].name, "company": company, "leave_type": leave_type,
            "from_date": date, "to_date": date, "status": status, "description": description,
            "leave_approver": "Administrator",
        })
        if status == "Approved" and leave.docstatus == 0:
            leave.submit()
    for employee, salary in people:
        for day in ["2026-09-14", "2026-09-15", "2026-09-17", "2026-09-18", "2026-09-21"]:
            attendance = ensure("Attendance", {"employee": employee.name, "attendance_date": day, "docstatus": ["!=", 2]}, {
                "employee": employee.name, "company": company, "attendance_date": day, "status": "Present",
            })
            if attendance.docstatus == 0:
                attendance.submit()
    component = ensure("Salary Component", "演示基本工资", {
        "salary_component": "演示基本工资", "salary_component_abbr": "HXBASE", "type": "Earning",
        "is_tax_applicable": 0, "depends_on_payment_days": 1,
    })
    structure = ensure("Salary Structure", "HX Monthly Demo", {
        "name": "HX Monthly Demo", "company": company, "is_active": "Yes", "currency": "CNY",
        "payroll_frequency": "Monthly",
        "earnings": [{"salary_component": component.name, "amount_based_on_formula": 1, "formula": "base", "depends_on_payment_days": 1}],
    })
    if structure.docstatus == 0:
        structure.submit()
    slips = []
    for employee, salary in people:
        assignment = ensure("Salary Structure Assignment", {"employee": employee.name, "salary_structure": structure.name, "docstatus": ["!=", 2]}, {
            "employee": employee.name, "salary_structure": structure.name, "from_date": "2026-01-01",
            "company": company, "currency": "CNY", "base": salary,
        })
        if assignment.docstatus == 0:
            assignment.submit()
        slip = ensure("Salary Slip", {"employee": employee.name, "start_date": "2026-09-01", "docstatus": ["!=", 2]}, {
            "employee": employee.name, "company": company, "salary_structure": structure.name,
            "posting_date": "2026-09-22", "start_date": "2026-09-01", "end_date": "2026-09-30", "payroll_frequency": "Monthly",
        })
        slips.append({"name": slip.name, "employee": employee.employee_name, "gross_pay": slip.gross_pay, "net_pay": slip.net_pay, "payment_days": slip.payment_days, "leave_without_pay": slip.leave_without_pay})
    opening = ensure("Job Opening", {"job_title": "前端工程师（演示岗位）", "company": company}, {
        "job_title": "前端工程师（演示岗位）", "company": company, "designation": "前端工程师", "status": "Open",
        "description": "<p>虚拟招聘岗位，用于体验官方招聘流程。</p>",
    })
    for name, email, status in [("顾星河（虚拟候选人）", "candidate-a@example.invalid", "Open"), ("沈可（虚拟候选人）", "candidate-b@example.invalid", "Shortlisted")]:
        ensure("Job Applicant", {"email_id": email}, {"applicant_name": name, "email_id": email, "job_title": opening.name, "status": status})
    frappe.db.commit()
    frappe.clear_cache()
    result = {"company": company, "employees": [e.name for e, _ in people], "salary_slips": slips}
    print("HRMS_DEMO_READY", json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    os.chdir("sites")
    frappe.init(site="hrms.localhost", sites_path=".")
    frappe.connect()
    try:
        seed()
    except Exception:
        frappe.db.rollback()
        raise
    finally:
        frappe.destroy()

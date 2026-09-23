$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$storyDir = Join-Path $projectRoot 'assets/story'
New-Item -ItemType Directory -Force -Path $storyDir | Out-Null
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SelectVoice('Microsoft Huihui Desktop')
$speaker.Rate = 1
$segments = @(
  @{id='intro'; title='拖沓开场'; keep=$false; text='大家好，今天我想介绍一个工具。稍等一下，我先想想从哪里说起。'},
  @{id='record'; title='随手记录'; keep=$true; text='这是一个叫 Blinko 的笔记工具。随手记录想法，也能用 Markdown 写清单和笔记。'},
  @{id='tags'; title='按主题整理'; keep=$true; text='给笔记加上标签，零散的信息就能按主题整理。'},
  @{id='search'; title='关键词找回'; keep=$true; text='需要的时候，输入关键词，就能找回之前的记录。'},
  @{id='outro'; title='明确结尾'; keep=$true; text='记录，整理，找回。把它当成你的个人知识收集箱。'},
  @{id='tail'; title='无效结尾'; keep=$false; text='好，今天大概就讲到这里。嗯，我再检查一下有没有遗漏。'}
)
foreach($segment in $segments){
  $speaker.SetOutputToWaveFile((Join-Path $storyDir ($segment.id+'.wav')))
  $speaker.Speak($segment.text)
  $speaker.SetOutputToNull()
}
$speaker.Dispose()
$segments | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $storyDir 'script.json') -Encoding utf8
python (Join-Path $PSScriptRoot 'prepare-story.py')
if($LASTEXITCODE -ne 0){throw 'Story preparation failed'}

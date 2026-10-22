# Unicode's emoji as the app's (emoji.js): python3 tools/emoji.py <emoji-test.txt> (unicode.org/Public/emoji/latest/). Its
# fully-qualified emoji, without the skin tones (U+1F3FB…1F3FF) nor the components group (their duplicates), a space apart
import re, sys
out, group, version = [], '', ''
for line in open(sys.argv[1], encoding='utf-8'):
    if line.startswith('# Version:'): version = line.split(':', 1)[1].strip()
    if line.startswith('# Date:'): date = line.split(':', 1)[1].split(',')[0].strip()
    if line.startswith('# group:'): group = line.split(':', 1)[1].strip(); continue
    m = re.match(r'^([0-9A-F ]+?)\s*; fully-qualified', line)
    if not m or group == 'Component': continue
    cps = [int(c, 16) for c in m.group(1).split()]
    if any(0x1F3FB <= c <= 0x1F3FF for c in cps): continue
    out.append(''.join(chr(c) for c in cps))
with open('emoji.js', 'w', encoding='utf-8') as o:
    o.write(f'// Unicode Emoji {version} (unicode.org/Public/emoji/latest/emoji-test.txt, {date}): its fully-qualified emoji, no skin tones nor\n'
            '// components (tools/emoji.py); Emoji, a start drawn from them at random (see randomEmoji)\n')
    o.write('const EMOJIS = "' + ' '.join(out) + '".split(" ");\n')
print(len(out))

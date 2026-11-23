"""Verify the complete static mockup, onboarding and fixed-page profiles."""
import argparse
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:8000')
parser.add_argument('--engine', choices=['chromium', 'webkit'], default='chromium')
parser.add_argument('--browser-channel')
parser.add_argument('--executable')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
for asset in json.loads((root / 'SOURCE.json').read_text())['files']:
    assert hashlib.sha256((root / asset['path']).read_bytes()).hexdigest() == asset['sha256'], asset['path']

with sync_playwright() as w:
    options = {}
    if args.browser_channel:
        options['channel'] = args.browser_channel
    if args.executable:
        options['executable_path'] = args.executable
    browser = getattr(w, args.engine).launch(**options)
    p = browser.new_page(viewport={'width': 390, 'height': 844})
    p.set_default_timeout(20000)
    errors, failed = [], []
    p.on('pageerror', lambda e: errors.append(str(e)))
    # Rapid page replacement deliberately cancels obsolete photo requests.
    p.on('requestfailed', lambda r: failed.append((r.url,r.failure)) if r.failure not in ('net::ERR_ABORTED','cancelled','Load request cancelled') else None)
    for asset in json.loads((root / 'SOURCE.json').read_text())['files']:
        response = p.request.get(args.url.rstrip('/') + '/' + asset['path'])
        assert response.status == 200, (asset['path'], response.status)
        assert hashlib.sha256(response.body()).hexdigest() == asset['sha256'], asset['path']
    def start(route='profiles'):
        p.goto('about:blank')
        assert p.goto(args.url.rstrip('/') + '/#' + route).status == 200
        p.evaluate('document.fonts.ready')

    for width, height in ((390, 844), (320, 693), (294, 636), (430, 931)):
        p.set_viewport_size({'width': width, 'height': height})
        start()
        p.locator('.paged-deck').wait_for()
        failures = p.evaluate('''() => {
            const failures=[];
            for(const [id,r] of Object.entries(db.people)) {
                if(!r.p?.name) continue;
                browseId=id;
                for(stage=0;stage<profilePageCount(r.p);stage++) {
                    render(true);
                    const card=document.querySelector('.deck>.card'), screen=document.getElementById('screen');
                    if(card.scrollHeight>card.clientHeight+1 || screen.scrollHeight>screen.clientHeight+1 || document.documentElement.scrollWidth>innerWidth+1) failures.push([id,stage]);
                }
            }
            return failures;
        }''')
        assert not failures, (width, failures)
        geometry = p.evaluate('''() => {browseId='yossi';const result=[];for(stage=0;stage<profilePageCount(rec(browseId).p);stage++){render(true);const photo=document.querySelector('.visual').getBoundingClientRect(),arrow=document.querySelector('.visual .prevpart svg').getBoundingClientRect();result.push([photo.height,arrow.y+arrow.height/2])}return result}''')
        assert all(pair == geometry[0] for pair in geometry), geometry
    p.set_viewport_size({'width':390,'height':844})
    start()
    person = p.evaluate('browseId')
    count = p.evaluate('profilePageCount(rec(browseId).p)')
    for step in range(count-1):
        assert p.evaluate('stage') == step
        p.locator('.visual .deck-next,.visual .nextpart').click()
        assert p.evaluate('browseId') == person
    p.locator('.visual [data-act=profileDecision]').click()
    assert p.locator('#dialog').is_visible()
    p.keyboard.press('Escape')
    p.locator('[data-act=ask]').click()
    assert 'הודעה' in p.locator('#dialog').inner_text()
    p.keyboard.press('Escape')
    p.locator('[data-act=expandProfilePhoto]').click()
    assert p.locator('.photo-viewer img').evaluate('e=>getComputedStyle(e).objectFit') == 'contain'
    p.keyboard.press('Escape')
    p.locator('[data-act=nextPerson]').first.click()
    assert p.evaluate('browseId') != person
    p.evaluate("db.reading.size='גדול מאוד';applyReading();stage=2;render(true)")
    assert p.locator('.body>p').evaluate('e=>e.scrollHeight<=e.clientHeight+1')

    # All twelve actual form steps, not a static preview. Free text stays verbatim.
    start('profile-interview')
    assert p.evaluate('steps.length') == 12
    answers = []
    for step in range(12):
        assert p.evaluate('interview') == step, (step,p.evaluate('interview'))
        form = p.locator('#interviewform')
        if step == 0:
            form.locator('[name=name]').fill('איילה')
            form.locator('[name=city]').select_option(label='רעננה')
        if step == 3:
            form.locator('[data-act=joy]').first.click()
        if step >= 6:
            assert form.locator('[data-act=answerIdea]').count() >= 3
            form.locator('[data-act=answerIdea]').first.click()
            field = form.locator('[name=answer]')
            if step == 11:
                field.fill('אני אוהבת לצייר פרחים ולדבר בנחת.')
            answers.append(field.input_value())
        form.locator('button.primary:not([data-act])').click()
    assert p.evaluate('page') == 'preview'
    expected = '\n'.join(answers)
    assert p.evaluate('draft.bio') == expected
    assert p.evaluate('draft.city') == 'רעננה'
    p.locator('[data-act=ownPreview]').click()
    assert p.locator('.paged-deck').count() == 1
    # Return from the preview and submit through the normal control.
    p.evaluate("page='preview';render(true)")
    p.locator('[data-act=submitProfile]').click()
    assert p.evaluate('page') == 'waiting'
    assert p.evaluate('rec().pending.bio') == expected
    p.evaluate("enterStaff('admin');staffId='previewExample';staffTab='detail';render(true)")
    p.locator('[data-act=approve][data-v=previewExample]').click()
    p.locator('[data-act=publish][data-v=previewExample]').click()
    assert p.evaluate("rec('previewExample').status") == 'active'
    assert p.evaluate("rec('previewExample').p.bio") == expected

    start('requests')
    p.locator('[data-act=senderProfile]').first.click()
    assert p.locator('.paged-deck').count() == 1
    p.locator('[data-act=backToRequest]').click()
    assert p.evaluate('page') == 'requests'
    start('chats')
    p.evaluate("openChat('ron')")
    p.locator('#msg').fill('טיוטה לבדיקה')
    p.locator('[data-act=viewChatProfile]').click()
    p.locator('[data-act=backToChat]').click()
    assert p.locator('#msg').input_value() == 'טיוטה לבדיקה'
    for route in ('report','block','meeting','yael-chat','noam-chat'):
        start(route)
        assert p.locator('#screen').inner_text().strip()
    for route, role in [('worker-mobile','worker'),('admin-mobile','admin')]:
        start(route)
        assert p.evaluate('role') == role
        assert p.locator('#screen').inner_text().strip()
    assert not errors, errors
    assert not failed, failed
    browser.close()
print('PASS:', args.engine, 'profile fit, arrows, photos, 12-step interview, free text, staff approval, chat drafts and role entries')

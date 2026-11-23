const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function createPdf() {
  const outputPath = path.resolve(__dirname, '../../docs/WAP_CAMPAIGN_FLOW_COMBINATIONS_GUIDE.pdf');
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    bufferPages: true,
  });

  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  const startX = 40;
  const contentWidth = 515;

  function ensureSpace(neededHeight) {
    if (doc.y + neededHeight > doc.page.height - 45) {
      doc.addPage();
      return true;
    }
    return false;
  }

  function addHeading1(title) {
    ensureSpace(60);
    const y = doc.y + 10;
    doc.rect(startX, y, contentWidth, 26).fill('#1E293B');
    doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold');
    doc.text(title, startX + 10, y + 7, { width: contentWidth - 20 });
    doc.y = y + 36;
  }

  function addHeading2(title) {
    ensureSpace(40);
    doc.fillColor('#2563EB').fontSize(11).font('Helvetica-Bold');
    doc.text(title, startX, doc.y + 6);
    doc.strokeColor('#DBEAFE').lineWidth(1.5);
    doc.moveTo(startX, doc.y + 2).lineTo(startX + contentWidth, doc.y + 2).stroke();
    doc.y += 8;
  }

  function addHeading3(title) {
    ensureSpace(30);
    doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold');
    doc.text(title, startX, doc.y + 4);
    doc.y += 4;
  }

  function addParagraph(text) {
    ensureSpace(25);
    doc.fillColor('#334155').fontSize(9).font('Helvetica');
    doc.text(text, startX, doc.y, { width: contentWidth, lineGap: 3 });
    doc.y += 6;
  }

  function addBullet(boldLabel, text) {
    ensureSpace(20);
    doc.fillColor('#2563EB').fontSize(9).font('Helvetica-Bold');
    doc.text('•  ', startX + 10, doc.y, { continued: true });
    doc.fillColor('#0F172A').text(boldLabel + ': ', { continued: true });
    doc.fillColor('#334155').font('Helvetica').text(text, { width: contentWidth - 20, lineGap: 2 });
    doc.y += 4;
  }

  function addCallout(title, text) {
    doc.fontSize(8.5).font('Helvetica');
    const textHeight = doc.heightOfString(text, { width: contentWidth - 30 });
    const boxHeight = textHeight + 26;
    ensureSpace(boxHeight + 10);
    
    const y = doc.y + 4;
    doc.rect(startX, y, contentWidth, boxHeight).fill('#F0F9FF');
    doc.rect(startX, y, 4, boxHeight).fill('#0284C7');
    doc.fillColor('#0369A1').fontSize(9.5).font('Helvetica-Bold').text(title, startX + 14, y + 6);
    doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica').text(text, startX + 14, y + 20, { width: contentWidth - 28, lineGap: 2 });
    doc.y = y + boxHeight + 8;
  }

  function drawTable({ headers, rows, colWidths }) {
    let y = doc.y + 4;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    function drawHeader() {
      doc.rect(startX, y, tableWidth, 22).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
      let hX = startX;
      headers.forEach((header, i) => {
        doc.text(header, hX + 5, y + 6, { width: colWidths[i] - 10, align: 'left' });
        hX += colWidths[i];
      });
      y += 22;
    }

    if (y + 45 > doc.page.height - 45) {
      doc.addPage();
      y = 45;
    }

    drawHeader();

    rows.forEach((row, rowIndex) => {
      let maxRowHeight = 18;
      doc.fontSize(8).font('Helvetica');
      row.forEach((cell, i) => {
        const h = doc.heightOfString(cell, { width: colWidths[i] - 10 });
        if (h + 8 > maxRowHeight) maxRowHeight = h + 8;
      });

      if (y + maxRowHeight > doc.page.height - 45) {
        doc.addPage();
        y = 45;
        drawHeader();
      }

      const bg = rowIndex % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
      doc.rect(startX, y, tableWidth, maxRowHeight).fill(bg);
      doc.rect(startX, y, tableWidth, maxRowHeight).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

      let rX = startX;
      row.forEach((cell, i) => {
        doc.fillColor(i === 0 ? '#0F172A' : '#334155');
        doc.fontSize(8).font(i === 0 ? 'Helvetica-Bold' : 'Helvetica');
        doc.text(cell, rX + 5, y + 4, { width: colWidths[i] - 10, align: 'left', lineGap: 1.5 });
        rX += colWidths[i];
      });

      y += maxRowHeight;
    });

    doc.y = y + 10;
  }

  // ==========================================
  // DOCUMENT HEADER / TITLE
  // ==========================================
  doc.rect(startX, 40, contentWidth, 75).fill('#0F172A');
  doc.fillColor('#38BDF8').fontSize(9).font('Helvetica-Bold').text('WAP MANAGER PLATFORM  •  TECHNICAL & OPERATIONAL REFERENCE', startX + 15, 52);
  doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('Campaign Flow & Verification Combinations Guide', startX + 15, 68);
  doc.fillColor('#94A3B8').fontSize(8.5).font('Helvetica').text('Comprehensive manual of Verification Modes, Landing Layouts, Redirects, Postbacks, and All 10 Funnel Combinations.', startX + 15, 90);
  doc.y = 125;

  addCallout(
    'Purpose of this Document',
    'Yeh document WAP Manager ke verification engine aur campaign flow configurations ka standard reference hai. Iski madad se campaign managers, media buyers aur developers kisi bhi telecom market (Middle East, Africa, Asia) ke compliance aur conversion requirements ke mutabik sahi flow select kar sakte hain.'
  );

  // ==========================================
  // SECTION 1: ARCHITECTURE OVERVIEW
  // ==========================================
  addHeading1('1. Overview & Flow Engine Architecture');
  addParagraph(
    'Hamara WAP Flow Engine telecom carrier billing (VAS / DCB), user identity capture (Header Enrichment ya OTP), partner APIs (checksub, blocklist, subscribe), aur affiliate network postbacks ko seamless handle karta hai. Har traffic click neeche diye gaye lifecyle stages se guzarta hai:'
  );

  drawTable({
    headers: ['Funnel Stage', 'Primary Function', 'Key APIs & Events Triggered'],
    colWidths: [110, 195, 210],
    rows: [
      ['1. Visit Arrival', 'Ad click se visitor landing URL par aata hai.', 'Mint internal click_id, bind original rcid.'],
      ['2. Identity Resolution', 'Carrier Header (HE) ya Mobile Number capture.', 'he.service, safaricom_masked, custom_http, ISP lookup.'],
      ['3. Subscriber Check', 'Operator se status verify (Active / New / Grace).', 'checksub API call. Active users seedha content portal jate hain.'],
      ['4. Funnel Rendering', 'Landing canvas, OTP screen, ya Pack confirmation.', 'CampaignPage (HOME, OTP, CONFIRM).'],
      ['5. Billing / Subscribe', 'Carrier Consent Gateway (CG) ya Direct Subscribe.', 'subscribe API call ya Telco CG 302 redirect with click_id.'],
      ['6. Outcome & Portal', 'Success/Portal redirect, Error, Low Balance.', 'Redirect immediately ya ~2s Thank-you paint.'],
      ['7. Vendor Postback', 'Affiliate network ko conversion report karna.', 'On Confirm, On OTP verify, ya Telco webhook callback.']
    ]
  });

  // ==========================================
  // SECTION 2: VERIFICATION MODES
  // ==========================================
  addHeading1('2. Verification Modes Breakdown');
  addParagraph(
    'Campaign Settings me Verification Mode decide karta hai ki subscriber ka mobile number kaise identify hoga aur carrier billing kaise execute hogi:'
  );

  drawTable({
    headers: ['Mode Name & ID', 'Identity Capture', 'Telco / Network Behavior', 'Wi-Fi / Missing Fallback'],
    colWidths: [120, 110, 175, 110],
    rows: [
      ['Header Injection\n(HEADER_INJECTION)', 'Cellular HTTP Header (HE)', 'Carrier gateway HTTP headers me MSISDN inject karta hai. Zero user input.', 'Error page ya Fail / CG Redirect URL.'],
      ['OTP only\n(OTP_ONLY)', 'Mobile Number + SMS OTP', 'No HE. Har network par user se number lekar SMS OTP authenticate kiya jata hai.', 'N/A (User manually enters number).'],
      ['Header Injection + OTP\n(BOTH)', 'HE first -> OTP fallback', 'Hybrid mode: Cellular par number automatically capture hota hai; Wi-Fi par OTP khulta hai.', 'Automatic OTP screen opens.'],
      ['Universe Telecom DCB\n(UNIVERSE_DCB)', 'PIN Flow / DCB Funnel', 'Middle East / Israel carrier direct billing. WAP pages ya direct vendor PIN APIs.', 'OTP / PIN authentication flow.'],
      ['Orange Burkina Faso\n(ORANGE_BF)', 'CheckSub -> Auth OTP', 'Burkina Faso (+226) VAS flow: CheckSub status check -> Auth OTP -> USSD validation.', 'Direct error if MSISDN missing.'],
      ['None (CG Redirect)\n(NONE)', 'Carrier Consent Gateway', 'Zero-landing flow. Click aate hi seedha telco official CG URL par redirect with click_id.', 'Redirected to telco CG directly.'],
      ['CG via HOME (no HE)\n(CG_HOME)', 'Pre-lander -> CG Redirect', 'User pehle HOME page dekhta hai. "Subscribe" click karne par Telco CG link par jata hai.', 'Redirected on CTA button click.']
    ]
  });

  // ==========================================
  // SECTION 3: SUB-OPTIONS & SETTINGS
  // ==========================================
  addHeading1('3. Sub-Options & Identity Resolution Settings');
  
  addHeading2('3.1 Under Header Injection & BOTH: "After HE resolved"');
  addBullet('HOME page', 'Number resolve hone ke baad bhi user ko HOME page dikhega jahan pricing packs (Daily/Weekly) aur subscribe CTAs hote hain. Compliant flows ke liye zaroori hai.');
  addBullet('Skip HOME', 'Number milte hi background me subscribe trigger hota hai aur direct portal khulta hai (Pure 1-Click zero-friction flow).');

  addHeading2('3.2 Under OTP Only: "Landing page" & "After OTP verified"');
  addBullet('OTP first (Landing)', 'Visitor link kholte hi seedha Mobile Number aur OTP input screen dekhta hai (No intro landing).');
  addBullet('HOME first (Landing)', 'User pehle attractive landing page (HOME) dekhta hai; button dabane par OTP screen aati hai.');
  addBullet('API expose (Landing)', 'Koi webpage nahi khulta. Vendor ke app ke liye public /api/otp/send aur /api/otp/verify endpoints expose hoti hain.');
  addBullet('HOME page (After OTP)', 'OTP verify hone ke baad user HOME page par packs choose karne jata hai.');
  addBullet('Skip HOME (After OTP)', 'OTP verify hote hi auto-subscribe ho jata hai aur direct Thank-You ya Portal open hota hai.');

  // ==========================================
  // SECTION 4: LANDING LAYOUT & REDIRECTS
  // ==========================================
  addHeading1('4. Landing Layout & Exit Redirect Timings');

  addHeading2('4.1 Landing Layout: Classic vs Checks before Home');
  drawTable({
    headers: ['Layout Mode', 'How It Works', 'Best Use Case'],
    colWidths: [120, 225, 170],
    rows: [
      ['Classic', 'User pehle HOME page dekhta hai. Button click karne par OTP / Confirm screen aati hai.', 'Standard 2-click marketing funnels.'],
      ['Checks before Home\n(packs_on_home)', 'Page load se pehle identity & checksub run hote hain. Already subscribed user direct portal jata hai; HE-miss seedha error/fallback jata hai.', 'High conversion 1-click & instant hybrid campaigns.']
    ]
  });

  addHeading2('4.2 Redirect URLs & Timings');
  addBullet('CG / home redirect URL', 'Telco Consent Gateway ka URL. NONE mode me landing par, CG_HOME me subscribe par, aur HE miss hone par yahan redirect hota hai. Placeholders: {{msisdn}}, {{click_id}}, {rcid}.');
  addBullet('Success / content URL', 'Successful subscription ke baad content portal ka URL. Placeholders: {{msisdn}}, {{click_id}} supported.');
  addBullet('Show thank-you', 'User ko ~2 seconds ke liye Thank You screen dikhata hai, fir portal URL redirect karta hai.');
  addBullet('Redirect immediately', 'Thank-you screen paint nahi hoti — instantly content portal khulta hai (Fastest user experience).');

  // ==========================================
  // SECTION 5: VENDOR CPA CALLBACK TIMING
  // ==========================================
  addHeading1('5. Vendor CPA Callback (Postback Timing)');
  addParagraph('Affiliate network / Media buyer ko conversion postback kab queue aur fire hoga:');

  drawTable({
    headers: ['Timing Mode', 'When Postback Is Queued', 'Must-Use Scenario', 'Deduplication Rule'],
    colWidths: [110, 155, 130, 120],
    rows: [
      ['On Confirm', 'Jab user Confirm / Subscribe button click karta hai.', 'Flows jisme HOME ya Confirm page par pack CTA ho.', 'Same MSISDN par single row update.'],
      ['On OTP verify', 'Jab user OTP enter karke verify continue karta hai.', 'Skip HOME flows ke liye mandatory (kyunki confirm button nahi hota).', 'Same MSISDN par single row update.'],
      ['Both', 'OTP verify aur Confirm click dono events par capture karta hai.', 'Hybrid / complex funnels jahan safe capture chahiye.', 'Same MSISDN par smart upsert (single postback fire).']
    ]
  });

  // ==========================================
  // SECTION 6: ALL 10 COMBINATIONS
  // ==========================================
  addHeading1('6. All 10 Practical Funnel Combinations');
  addParagraph('Har telecom campaign scenario ke liye complete configuration, user journey aur recommendation:');

  drawTable({
    headers: ['Combo # & Name', 'Config Settings', 'Step-by-Step User Journey', 'Target Traffic & Benefit'],
    colWidths: [100, 115, 185, 115],
    rows: [
      [
        'Combo 1:\nPure 1-Click Mobile Data',
        '• Mode: HEADER_INJECTION\n• After HE: Skip HOME\n• Layout: Checks before Home\n• Success: Redirect immediately\n• Postback: On Confirm',
        'User ad click karta hai -> System cellular header se MSISDN nikaalta hai -> Direct subscribe API call -> Instant portal open.',
        'Mobile 3G/4G traffic. Zero friction, highest conversion rate.'
      ],
      [
        'Combo 2:\nStandard 2-Click Cellular',
        '• Mode: HEADER_INJECTION\n• After HE: HOME page\n• Layout: Classic\n• Success: Show thank-you\n• Postback: On Confirm',
        'User landing page dekhta hai -> HE se number detect hota hai -> User "Subscribe" button click karta hai -> Thank-you -> Portal.',
        'Regulated markets jahan user se pack pricing consent zaroori ho.'
      ],
      [
        'Combo 3:\nUniversal Hybrid Flow',
        '• Mode: BOTH\n• After HE: HOME page\n• Layout: Checks before Home\n• Postback: Both',
        'Cellular: Direct number detect -> HOME pack select.\nWi-Fi: HE fail -> Turant OTP screen -> Verify -> HOME pack select.',
        'Mixed traffic (Facebook, TikTok, Google) jahan Wi-Fi + Data dono hain.'
      ],
      [
        'Combo 4:\nDirect PIN-to-Bill Flow',
        '• Mode: OTP_ONLY\n• Landing: OTP first\n• After OTP: Skip HOME\n• Layout: Checks before Home\n• Postback: On OTP verify\n• Success: Redirect immediately',
        'User link click karta hai -> Direct Phone + OTP screen -> OTP submit -> Instant subscription -> Content portal.',
        'Popunder, direct redirect. Wi-Fi traffic par fastest conversion.'
      ],
      [
        'Combo 5:\nOTP First + Pack Select',
        '• Mode: OTP_ONLY\n• Landing: OTP first\n• After OTP: HOME page\n• Layout: Checks before Home\n• Postback: On Confirm\n• Success: Show thank-you',
        'User number daal kar OTP verify karta hai -> HOME screen par Daily/Weekly packs dikhte hain -> User choose karta hai -> Success.',
        'Jahan telco pehle identity authenticate karwata hai fir pack choose karwata hai.'
      ],
      [
        'Combo 6:\nClassic 2-Step Prelander',
        '• Mode: OTP_ONLY\n• Landing: HOME first\n• After OTP: HOME page\n• Layout: Classic\n• Postback: On Confirm\n• Success: Show thank-you',
        'User landing page dekhta hai -> "Start" click karta hai -> OTP enter karta hai -> Confirm pack screen aati hai -> Subscribe.',
        'Branded search traffic. Maximum user intent, low unsubscription.'
      ],
      [
        'Combo 7:\nPrelander + Instant Subscribe',
        '• Mode: OTP_ONLY\n• Landing: HOME first\n• After OTP: Skip HOME\n• Layout: Classic\n• Postback: On OTP verify\n• Success: Redirect immediately',
        'User teaser landing page dekhta hai -> CTA click karta hai -> OTP screen khulti hai -> OTP verify hote hi direct portal.',
        'Advertorials, review pages. Pre-sell hone ke baad single verification.'
      ],
      [
        'Combo 8:\nZero-Landing Carrier Consent',
        '• Mode: NONE\n• CG URL: Telco official URL\n• Postback: Telco Callback webhook',
        'User click karte hi bina koi page dekhe direct Operator ke official payment portal par redirect hota hai.',
        'Tier-1 carriers (STC, Zain) jahan hosted landing pages allow nahi hote.'
      ],
      [
        'Combo 9:\nPrelander to Carrier CG',
        '• Mode: CG_HOME\n• CG URL: Telco official URL\n• Postback: Telco Callback webhook',
        'User hamare attractive HOME page par teaser dekhta hai -> "Subscribe" dabate hi Operator official CG link par redirect hota hai.',
        'Operator page par bounce rate kam karne ke liye presell.'
      ],
      [
        'Combo 10:\nHeadless / In-App APIs',
        '• Mode: OTP_ONLY / DCB\n• Landing: API expose\n• Postback: Both / S2S',
        'Koi WAP page nahi banta. Mobile App direct hamari /api/otp/send aur /api/otp/verify endpoints hit karke billing karti hai.',
        'Android / iOS native apps jo apni custom UI ke andar billing integrate karte hain.'
      ]
    ]
  });

  // ==========================================
  // SECTION 7: QUICK DECISION MATRIX
  // ==========================================
  addHeading1('7. Quick Decision Matrix (Cheat Sheet)');
  addParagraph('Apne campaign goal aur traffic type ke mutabik sahi settings select karein:');

  drawTable({
    headers: ['Marketing Objective', 'Verification Mode', 'Landing Page', 'After Identity', 'Postback Timing', 'Exit Timing'],
    colWidths: [130, 95, 75, 75, 75, 65],
    rows: [
      ['Fastest 1-Click (Cellular)', 'HEADER_INJECTION', 'HOME', 'Skip HOME', 'On Confirm', 'Immediate'],
      ['Compliant 2-Click (Cellular)', 'HEADER_INJECTION', 'HOME', 'HOME page', 'On Confirm', 'Thank-you'],
      ['Universal (Data + Wi-Fi)', 'BOTH', 'HOME', 'HOME page', 'Both', 'Thank-you'],
      ['Fastest PIN-to-Bill (Wi-Fi)', 'OTP_ONLY', 'OTP first', 'Skip HOME', 'On OTP verify', 'Immediate'],
      ['OTP First + Pack Select', 'OTP_ONLY', 'OTP first', 'HOME page', 'On Confirm', 'Thank-you'],
      ['Pre-lander + Instant Access', 'OTP_ONLY', 'HOME first', 'Skip HOME', 'On OTP verify', 'Immediate'],
      ['High Intent / Low Churn', 'OTP_ONLY', 'HOME first', 'HOME page', 'On Confirm', 'Thank-you'],
      ['Direct Telco Consent', 'NONE', 'N/A', 'N/A', 'Callback', 'CG 302'],
      ['Pre-lander to Telco Consent', 'CG_HOME', 'HOME', 'N/A', 'Callback', 'CG 302'],
      ['Native Mobile App / SDK', 'OTP_ONLY / DCB', 'API expose', 'N/A', 'Both', 'JSON API']
    ]
  });

  // ==========================================
  // PAGE NUMBERS IN FOOTER (Two-pass)
  // ==========================================
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.strokeColor('#E2E8F0').lineWidth(0.5);
    doc.moveTo(startX, doc.page.height - 30).lineTo(startX + contentWidth, doc.page.height - 30).stroke();
    
    doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica');
    doc.text('WAP Manager Campaign Flow Guide  •  Confidential & Internal', startX, doc.page.height - 24, { width: 300 });
    doc.text(`Page ${i + 1} of ${range.count}`, startX + contentWidth - 100, doc.page.height - 24, { width: 100, align: 'right' });
  }

  doc.end();

  writeStream.on('finish', () => {
    console.log(`PDF created successfully (${range.count} pages) at: ${outputPath}`);
  });
}

createPdf();

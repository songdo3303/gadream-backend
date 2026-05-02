const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const TO_EMAIL = 'sksk3222@naver.com';
const TO_PHONE = '010-7548-3222';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const d = req.body;
    const isListing = d.formType === 'listing';

    const subject = isListing
      ? `[가드림 매물접수] ${d.aptName || ''} ${d.dong || ''}동 ${d.ho || ''}호 / ${d.dealType || ''}`
      : `[가드림 집구하기] ${d.clientName || ''} / ${d.dealType || ''}`;

    const html = isListing ? buildListingHtml(d) : buildSearchHtml(d);

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: TO_EMAIL,
      subject,
      html,
    });

    // ── Solapi 카카오 알림톡 (템플릿 승인 후 활성화) ──────────────
    // await sendKakao(d, isListing);
    // ────────────────────────────────────────────────────────────────

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '전송 실패', detail: err.message });
  }
};

// ── 이메일 HTML: 매물내놓기 ─────────────────────────────────────────
function buildListingHtml(d) {
  const row = (label, value) =>
    value
      ? `<tr><td style="padding:8px 12px;font-weight:600;color:#374151;white-space:nowrap;background:#F9FAFB;border:1px solid #E5E7EB;width:140px">${label}</td><td style="padding:8px 12px;color:#111827;border:1px solid #E5E7EB">${value}</td></tr>`
      : '';

  const section = (title, rows) =>
    `<h3 style="margin:24px 0 8px;font-size:14px;color:#2563EB;border-bottom:2px solid #2563EB;padding-bottom:4px">${title}</h3>
     <table style="width:100%;border-collapse:collapse">${rows}</table>`;

  const dealLabel = { sell: '매매', rent: '전세', monthly: '월세' }[d.dealType] || d.dealType;

  let priceRows = '';
  if (d.dealType === 'sell') priceRows = row('매매가', num(d.price1));
  else if (d.dealType === 'rent') priceRows = row('전세보증금', num(d.price1));
  else priceRows = row('월세보증금', num(d.price1)) + row('월임대료', num(d.price2));

  let tenantRows = '';
  if (d.residence === 'tenant') {
    tenantRows =
      row('계약만료일', d.tenantExpiry) +
      row('세입자상태', d.tenantStatus === 'stay' ? '거주예정' : '퇴거예정') +
      row('세입자이름', d.tenantName) +
      row('세입자연락처', d.tenantPhone);
    if (d.dealType === 'sell') {
      tenantRows += row('세입자계약', d.tenantDeal === 'rent' ? '전세' : '월세');
      tenantRows += row('세입자보증금', num(d.tenantDeposit));
      if (d.tenantDeal === 'monthly') tenantRows += row('월임대료', num(d.tenantMonthly));
    }
  }

  return `
<!DOCTYPE html><html lang="ko"><body style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827">
<div style="background:#2563EB;color:#fff;padding:16px 24px;border-radius:12px 12px 0 0">
  <div style="font-size:22px;font-weight:800">가드림 매물접수</div>
  <div style="font-size:13px;margin-top:4px;opacity:.8">${new Date().toLocaleString('ko-KR')}</div>
</div>
<div style="border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:20px">

${section('📌 매물 기본정보',
  row('매물유형', d.propType === 'apt' ? '아파트' : '오피스텔') +
  row('거래유형', dealLabel) +
  (d.dealType !== 'sell' ? row('대출여부', { none:'대출없음(융자무)', full:'잔금시 전액상환', partial:'잔금시 일부상환' }[d.loanType] || '-') : '') +
  priceRows
)}

${section('🏢 매물 위치',
  row('아파트명', d.aptName) +
  row('동/호수', `${d.dong}동 ${d.ho}호`) +
  row('공급/전용면적', d.unitArea) +
  row('타입/층/방향', d.unitDetail)
)}

${section('👤 집주인 정보',
  row('이름', d.ownerName) +
  row('통신사', d.ownerCarrier) +
  row('연락처', d.ownerPhone)
)}

${section('🏠 거주 상태',
  row('현재상태', { vacant:'공실', owner:'집주인 거주 중', tenant:'세입자 거주 중' }[d.residence] || d.residence) +
  tenantRows
)}

${section('📅 입주 가능일',
  row('입주가능일', d.moveIn)
)}

${d.condList ? section('✅ 의뢰인 상황', row('선택항목', d.condList)) : ''}
${d.structList ? section('🏗 생활/구조 옵션', row('선택항목', d.structList)) : ''}
${d.applList ? section('⚡ 가전/가구 옵션', row('선택항목', d.applList) + row('시스템에어컨', d.acCount || '-')) : ''}
${d.intrList ? section('🔨 인테리어/수리', row('선택항목', d.intrList)) : ''}
${d.intro ? section('💬 한줄 소개', row('내용', d.intro)) : ''}

</div>
</body></html>`;
}

// ── 이메일 HTML: 집구하기 ───────────────────────────────────────────
function buildSearchHtml(d) {
  const row = (label, value) =>
    value
      ? `<tr><td style="padding:8px 12px;font-weight:600;color:#374151;white-space:nowrap;background:#F9FAFB;border:1px solid #E5E7EB;width:140px">${label}</td><td style="padding:8px 12px;color:#111827;border:1px solid #E5E7EB">${value}</td></tr>`
      : '';

  const section = (title, rows) =>
    `<h3 style="margin:24px 0 8px;font-size:14px;color:#2563EB;border-bottom:2px solid #2563EB;padding-bottom:4px">${title}</h3>
     <table style="width:100%;border-collapse:collapse">${rows}</table>`;

  const dealLabel = { sell: '매매', rent: '전세', monthly: '월세' }[d.dealType] || d.dealType;

  let priceRows = '';
  if (d.dealType === 'sell') priceRows = row('매매 희망가', num(d.price1));
  else if (d.dealType === 'rent') priceRows = row('전세 희망가', num(d.price1));
  else priceRows = row('보증금 희망가', num(d.price1)) + row('월세 희망가', num(d.price2));

  return `
<!DOCTYPE html><html lang="ko"><body style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827">
<div style="background:#059669;color:#fff;padding:16px 24px;border-radius:12px 12px 0 0">
  <div style="font-size:22px;font-weight:800">가드림 집구하기 접수</div>
  <div style="font-size:13px;margin-top:4px;opacity:.8">${new Date().toLocaleString('ko-KR')}</div>
</div>
<div style="border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:20px">

${section('📌 기본 정보',
  row('매물유형', d.propType === 'apt' ? '아파트' : '오피스텔') +
  row('거래유형', dealLabel) +
  priceRows
)}

${section('🏢 희망 아파트', row('선택단지', d.aptList))}
${section('🧭 선호 방향', row('선택방향', d.dirList || '무관'))}

${section('👤 의뢰인 정보',
  row('이름', d.clientName) +
  row('통신사', d.clientCarrier) +
  row('연락처', d.clientPhone)
)}

${section('📅 입주 희망일', row('희망일', d.moveIn))}

${d.condList ? section('✅ 의뢰인 상황', row('선택항목', d.condList)) : ''}
${d.structList ? section('🏗 생활/구조 옵션', row('선택항목', d.structList)) : ''}
${d.applList ? section('⚡ 가전/가구 옵션', row('선택항목', d.applList) + row('시스템에어컨', d.acCount || '-')) : ''}
${d.intrList ? section('🔨 인테리어/수리', row('선택항목', d.intrList)) : ''}
${d.intro ? section('💬 원하는 집 소개', row('내용', d.intro)) : ''}

</div>
</body></html>`;
}

// ── Solapi 카카오 알림톡 (템플릿 승인 후 주석 해제) ─────────────────
// async function sendKakao(d, isListing) {
//   const crypto = require('crypto');
//   const date = new Date().toISOString();
//   const salt = Math.random().toString(36).substring(2);
//   const hmac = crypto.createHmac('sha256', process.env.SOLAPI_SECRET);
//   hmac.update(date + salt);
//   const signature = hmac.digest('hex');
//
//   const message = isListing ? buildKakaoListing(d) : buildKakaoSearch(d);
//
//   await fetch('https://api.solapi.com/messages/v4/send', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `HMAC-SHA256 apiKey=${process.env.SOLAPI_APIKEY}, date=${date}, salt=${salt}, signature=${signature}`,
//     },
//     body: JSON.stringify({
//       message: {
//         to: TO_PHONE,
//         from: '등록된발신번호',   // Solapi에 등록한 발신번호로 교체
//         kakaoOptions: {
//           pfId: process.env.SOLAPI_PFID,
//           templateId: isListing ? process.env.KAKAO_TPL_LISTING : process.env.KAKAO_TPL_SEARCH,
//           variables: message,
//         },
//       },
//     }),
//   });
// }

function num(v) {
  if (!v) return null;
  return Number(v).toLocaleString('ko-KR') + '만원';
}

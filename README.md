# 가드림 백엔드 배포 가이드

## 폴더 구조
```
gadream-backend/
├── api/
│   └── submit.js       ← 서버리스 API (이메일 발송)
├── public/
│   ├── listing.html    ← 매물내놓기 폼
│   └── search.html     ← 집구하기 폼
├── package.json
├── vercel.json
└── README.md
```

## 배포 순서

### 1. GitHub에 올리기
1. github.com 가입 (없으면)
2. New repository → 이름: `gadream-backend` → Create
3. 이 폴더 전체를 업로드 (Upload files)

### 2. Vercel 배포
1. vercel.com → GitHub 계정으로 로그인
2. "Add New Project" → GitHub 연결 → `gadream-backend` 선택
3. Import 클릭

### 3. 환경변수 설정 (중요!)
Vercel 프로젝트 → Settings → Environment Variables 에서 아래 추가:

| Key | Value |
|-----|-------|
| RESEND_API_KEY | (Resend 재발급 키) |
| SOLAPI_APIKEY | (Solapi 재발급 키) |
| SOLAPI_SECRET | (Solapi 재발급 시크릿) |
| SOLAPI_PFID | (솔라피 카카오채널 연동 후 발급되는 pfId) |

### 4. Deploy 클릭
→ 배포 완료 후 URL 발급 (예: https://gadream-backend.vercel.app)

### 5. 리틀리 링크 연결
- 매물내놓기: https://gadream-backend.vercel.app/listing.html
- 집구하기: https://gadream-backend.vercel.app/search.html

---

## 카카오 알림톡 활성화 (나중에)
템플릿 승인 완료 후 api/submit.js 에서:
1. `sendKakao` 함수 주석 해제
2. `from` 번호를 솔라피에 등록한 발신번호로 교체
3. GitHub push → Vercel 자동 재배포

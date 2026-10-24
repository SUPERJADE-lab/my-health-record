# 나의 건강 기록장

검사 결과, 혈압·걸음 수·체중, 마운자로 투약 기록을 맥북·아이폰·아이패드에서 함께 보는 개인용 웹앱이에요.

- 화면: React + Vite, 홈 화면에 추가하면 앱처럼 열리는 PWA
- 저장: Supabase (로그인한 본인 기록만 읽고 쓰는 보안 규칙, `supabase/schema.sql`)
- 배포: `main`에 올리면 GitHub Actions가 GitHub Pages로 자동 배포

이 저장소에는 화면 코드만 있고 건강 기록은 들어 있지 않아요.

## 처음 설정

1. Supabase SQL Editor에서 `supabase/schema.sql` 실행
2. Authentication → Users에서 본인 계정 만들기, 새 가입 막기
3. `src/config.js`에 Project URL과 publishable(anon) 키 넣기
4. 저장소 Settings → Pages → Source를 GitHub Actions로

## 로컬에서 실행

```
npm install
npm run dev
```

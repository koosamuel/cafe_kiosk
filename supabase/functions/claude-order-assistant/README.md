# Claude 주문 도우미 Edge Function

이 함수는 GitHub Pages의 공개 JavaScript가 Claude API 키를 갖지 않도록 서버에서만 Anthropic Messages API를 호출한다.

## 역할

- 추천·비교·메뉴 정보 답변의 문장 표현만 Claude로 보강한다.
- 주문 추가, 옵션 선택, 수량 변경, 주문 확정, 가격 계산은 수행하지 않는다.
- 해당 동작은 브라우저 규칙 엔진과 `create_kiosk_order` RPC가 계속 검증한다.

## 배포 전 Secret 등록

`ANTHROPIC_API_KEY`와 `ANTHROPIC_MODEL`을 Supabase Secret에 설정한다. 키 값은 이 폴더, `.env.example`, `config.js`, GitHub 저장소에 저장하지 않는다.

```bash
supabase secrets set --project-ref YOUR_PROJECT_REF \
  ANTHROPIC_API_KEY='YOUR_KEY' \
  ANTHROPIC_MODEL='YOUR_AVAILABLE_CLAUDE_MODEL'
supabase functions deploy claude-order-assistant --project-ref YOUR_PROJECT_REF
```

공개 데모를 위한 함수이므로 허용 Origin, 요청 크기, 인스턴스별 요청 빈도를 제한한다. 실제 공개 운영 전에는 인증 또는 CAPTCHA 기반 제한을 추가한다.

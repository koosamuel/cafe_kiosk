# 모닝브루 카페 키오스크

태블릿에서 메뉴 선택·옵션·장바구니·주문 접수를 처리하고, 데모 운영판에서 최근 실제 주문 상태를 관리하는 정적 웹 키오스크입니다.

## 구조

```text
GitHub Pages 정적 클라이언트
├─ 메뉴 선택·옵션·장바구니·주문 확인
├─ 메뉴 문서 검색 기반 주문 도우미
├─ PWA 정적 자산 캐시
└─ Supabase Publishable Key
          ↓
Supabase
├─ Postgres: 메뉴·옵션·주문·주문 항목
├─ Auth/RLS: 실제 운영용 사용자 권한 보존
├─ Demo RPC: 공용 번호로 최근 활성 주문만 조회·상태 전환
├─ RPC: 서버 검증 가격 계산과 주문 생성
└─ Realtime: 운영자 주문판 갱신
          ↓
Supabase Edge Function (선택)
└─ Claude API: 추천·비교·메뉴 정보 답변 보강
```

클라이언트가 전송한 가격은 신뢰하지 않습니다. `create_kiosk_order` 함수가 활성 메뉴와 옵션 가격을 데이터베이스에서 다시 조회해 총액을 계산합니다. 각 주문에는 클라이언트가 생성한 `request_id`가 포함되며, 같은 요청이 재전송되면 서버가 기존 주문을 반환해 중복 주문을 방지합니다.

## 주요 기능

- 전체·커피·논커피·티·디저트 분류와 검색
- 12개 메뉴 카드의 공식 스타벅스 메뉴 참고 이미지
- HOT/ICE, 크기, 샷·디카페인·오트 밀크 등 옵션
- 장바구니 수량 변경과 포장/매장 선택
- 카드 또는 카운터 결제 요청과 주문번호 발급
- 아이디 없이 미리 입력된 공용 운영 번호로 여는 `접수 → 제조 중 → 픽업 대기 → 완료` 데모 주문판
- 최근 24시간의 실제 Supabase 활성 주문 조회와 5초 폴링 갱신
- Supabase 미설정 상태에서도 확인할 수 있는 데모 모드
- 태블릿·모바일 반응형 화면과 PWA 정적 자산 캐시
- 상단 버튼으로 전체화면에 진입하고 고정된 종료 버튼 또는 `Esc`로 해제하며 브라우저별 API 차이를 처리
- WebMCP 지원 브라우저에서 메뉴 조회·장바구니 추가·주문 접수 도구 등록
- 박우진 교수님 RAG 키오스크의 문자 n-gram 검색·추천·비교·식사 페어링·대화 문맥·옵션 주문 흐름을 반영한 AI 주문 도우미
- 추천·비교 결과의 카테고리 자동 전환, 메뉴 카드 강조와 고객용 가격·옵션 근거 패널
- 시스템 프롬프트·내부 정보 요청 차단, 미판매 메뉴 오인식 방지와 빈 장바구니 결제 안내
- 한 문장 안의 메뉴 추가·삭제를 순서대로 반영하는 복합 장바구니 액션

실제 카드 승인은 포함하지 않습니다. 결제 단말 업체의 SDK 또는 POS 연동을 별도로 검토해야 합니다.

## 메뉴 이미지 출처

`assets/menu/`의 12개 이미지는 교육용 데모 화면을 위해 [스타벅스 코리아 공식 메뉴](https://www.starbucks.co.kr/menu/drink_list.do)에서 내려받은 썸네일입니다. 현재 키오스크의 가상 메뉴명·가격과 공식 이미지의 원래 상품이 정확히 일치하지 않는 항목이 있으며, 이 프로젝트는 스타벅스와 제휴하거나 후원받지 않습니다. 외부 공개·상업 운영 전에는 사용 허가를 받은 자체 이미지로 교체합니다.

## 로컬 실행

저장소를 받은 뒤 프로젝트 루트에서 정적 서버를 실행합니다. 별도 패키지 설치는 필요하지 않습니다.

```bash
git clone https://github.com/koosamuel/cafe_kiosk.git
cd cafe_kiosk
python3 -m http.server 8000
```

`http://localhost:8000`을 엽니다. 현재 `config.js`는 Seoul 리전의 `cafe-kiosk` Supabase 프로젝트에 연결되어 있으며 `DEMO_MODE: false`입니다. 오프라인 데모만 확인하려면 로컬에서 일시적으로 `DEMO_MODE: true`로 바꿉니다.

주문 도우미의 검색·의도 분류 테스트는 별도 설치 없이 실행할 수 있습니다.

```bash
npm test
npm run check
```

## 박우진 교수님 RAG 코드 반영 범위

기존 `ai-applications-assignments-koo/rag-kiosk`의 메뉴 문서 검색, 추천·비교·주문 의도 구분, 메뉴 ID·수량 검증 원칙을 현재 키오스크 화면과 장바구니에 맞게 통합했습니다. 브라우저의 `rag-assistant.js`는 현재 Supabase 메뉴만 검색하며, 자연어에서 온도·크기·추가 옵션과 수량을 읽어 현재 옵션 목록으로 검증한 뒤 장바구니에 반영합니다. 짧은 후속 답변은 최근 사용자 문맥을 사용하고, 식사 페어링은 실제 판매 중인 메뉴만 추천합니다.

Claude 호출은 `supabase/functions/claude-order-assistant/`의 서버 전용 Edge Function에서 처리합니다. 정적 GitHub Pages 클라이언트에는 API 키를 넣지 않습니다. Claude는 추천·비교·메뉴 정보의 문장 답변만 보강하고, 메뉴·옵션·수량의 주문 액션은 기존 규칙 엔진이 처리합니다. 최종 가격·가용 메뉴·주문 생성은 계속 Supabase RPC가 검증합니다. 세부 대응 관계는 `PARK_RAG_INTEGRATION.md`를 참고합니다.

HTI·UX·UI 통합 기준, 현재 구현 범위와 162개 카탈로그·219문서 RAG 확장 계획은 `03_구현계획.md`를 참고합니다.

## Supabase 연결

1. 카페용 Supabase 프로젝트를 새로 만듭니다.
2. SQL Editor에서 `supabase/schema.sql` 전체를 실행합니다.
3. 데모 운영판을 사용할 때는 `202610130004_demo_operator_pin.sql` 마이그레이션을 적용합니다.
4. `config.js`에 Project URL과 **Publishable Key**를 입력하고 `DEMO_MODE`를 `false`, `PUBLIC_ORDER_BOARD`를 `true`로 설정합니다.
5. 일반 화면에서 주문을 만든 뒤 공용 번호 주문판에서 조회·상태 전환을 시험합니다.
6. 실제 운영으로 전환할 때는 Authentication 사용자를 만들고 `staff_profiles` 권한과 RLS를 검증한 뒤 공용 번호 모드를 제거합니다.

```js
window.CAFE_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "YOUR_PUBLISHABLE_KEY",
  DEMO_MODE: false,
  PUBLIC_ORDER_BOARD: true,
};
```

Publishable Key는 RLS를 전제로 브라우저에서 사용하는 공개 식별자입니다. 데이터베이스 비밀번호, Secret Key, `service_role` 키는 `config.js`나 GitHub 저장소에 넣지 않습니다.

### Claude API 연결

Claude API 키는 저장소의 텍스트 파일이나 `config.js`에 넣지 않고, Supabase Edge Function Secret으로만 등록합니다. 모델 이름도 서버 Secret으로 관리합니다.

```bash
supabase secrets set --project-ref YOUR_PROJECT_REF \
  ANTHROPIC_API_KEY='YOUR_KEY' \
  ANTHROPIC_MODEL='YOUR_AVAILABLE_CLAUDE_MODEL'
supabase functions deploy claude-order-assistant --project-ref YOUR_PROJECT_REF
```

공개 키오스크이므로 함수는 GitHub Pages와 로컬 개발 주소만 CORS로 허용하고, 요청 길이와 인스턴스별 요청 빈도를 제한합니다. 이 제한은 데모 보호 장치이므로 실제 공개 운영에서는 사용자 인증 또는 CAPTCHA 기반 제한을 추가해야 합니다.

공용 운영 번호는 발표 데모 편의를 위한 공유 잠금장치일 뿐 사용자별 인증이 아닙니다. RPC는 최근 24시간 활성 주문과 순차 상태 전환만 허용하지만, 번호를 아는 누구나 주문 상태를 바꿀 수 있으므로 실제 매장 운영에는 사용하지 않습니다.

## 공동 작업

공동 작업 규칙과 파일별 담당 범위는 `CONTRIBUTING.md`를 따릅니다. 팀원은 `main/kiosk`에서 직접 작업하며, 작업 시작과 push 직전에 `git pull --rebase origin main`으로 최신 변경을 반영합니다.

`main`에 변경이 push되면 GitHub Actions가 테스트와 정적 빌드를 수행하고 GitHub Pages에 자동 배포합니다.

- 공개 주소: https://koosamuel.github.io/cafe_kiosk/
- 코드 저장소: https://github.com/koosamuel/cafe_kiosk
- 배포 워크플로: `.github/workflows/deploy-pages.yml`

## 정적 배포 결과 생성

모든 경로가 상대 경로로 작성되어 GitHub Project Pages를 포함한 정적 호스팅에서 동작합니다.

배포 전 정적 결과물을 만들려면 다음을 실행합니다.

```bash
chmod +x scripts/build-static.sh
./scripts/build-static.sh
```

`dist/`는 GitHub Actions가 Pages에 업로드하는 배포 결과물이며 소스 저장소에는 커밋하지 않습니다.

## 운영 전 확인

- 실제 메뉴명·가격·품절 상태 반영
- 발표 후 `PUBLIC_ORDER_BOARD` 비활성화 및 공용 번호 자동 입력 제거
- 운영자 계정과 `staff_profiles` 권한 확인
- 익명 사용자가 주문 목록을 읽거나 수정할 수 없는지 확인
- 서로 다른 두 기기에서 주문 접수와 Realtime 갱신 확인
- 네트워크 장애 시 안내와 복구 확인
- 결제 단말 연동 전 화면에 결제 완료로 표시하지 않기
- 생성형 RAG 서버를 연결할 때 API 키가 브라우저 번들·`config.js`·GitHub 이력에 포함되지 않는지 확인

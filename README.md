# PT & Pilates IN BLUE — 홍보 홈페이지

체형교정 · 재활 전문 스튜디오 **IN BLUE**(장안점 · 성내점)의 홍보 웹사이트입니다.
별도 서버나 설치 없이 `index.html` 을 더블클릭하면 바로 열립니다.

---

## 1. 페이지 구성

| 파일 | 메뉴 | 내용 |
|---|---|---|
| `index.html` | Introduction to IN BLUE / 인블루 소개 | 브랜드 소개, 3대 프로그램(PILATES + PT + CONDITIONING), 50분 수업 흐름 |
| `branch.html` | Branch Introduction / 지점소개 | 상단 탭으로 **장안점 / 성내점** 전환, 시설 사진·특징·보유 기구 |
| `instructor.html` | Instructor Introduction / 강사소개 | 상단 탭으로 지점 전환, 임도영 대표(장안) · 신승현 대표(성내) 자격/경력 |
| `before-after.html` | Before & After / 비포애프터 | 프로그램 4종, BEFORE → PROCESS → AFTER, 변화 슬라이더, 사례 카드 |
| `reservation.html` | Reservation / 일일 체험 예약 | CHOOSE YOUR STUDIO, 지점별 사진·강사·네이버 플레이스, **상담 예약 폼** |
| `admin.html` | (비공개) | 접수된 상담 문의 확인 · 전화 연결 · 상태 관리 |

상단 네비게이션은 스크롤해도 화면 위에 고정되며, 메뉴마다 영문 아래 한글 라벨이 함께 표시됩니다.

---

## 2. 상담 예약 → 관리자 연동

1. 방문자가 `reservation.html` 에서 **상담 예약하기** 를 누르면 입력 폼이 열립니다.
   - 지점 선택 / 이름(직접 입력) / 전화번호(**010 고정 + 뒤 8자리**) / 나이(숫자 선택)
   - 관심 프로그램 · 통화 가능 시간 · 문의 내용 · 개인정보 동의
2. 접수되면 Vercel 서버 API를 통해 비공개 Blob 저장소에 저장되고 `admin.html` 로 전달됩니다.
3. `admin.html` 우측 상단 **벨 아이콘**에 오늘 접수 건수가 뱃지로 표시됩니다.
   - 1 ~ 99 까지는 숫자 그대로, 100건 이상이면 **99+** 로 표기
   - 새 문의가 들어오면 벨이 흔들리고 하단에 알림이 뜹니다
4. 목록에서 행을 클릭하면 상세 패널이 열리고, **전화 걸기** 버튼으로 바로 통화할 수 있습니다.
5. 필터(전체/신규/완료/지점별), 이름·번호 검색, **CSV 내려받기** 를 지원합니다.

> **테스트 방법**
> 배포된 `reservation.html` 에서 예약을 접수한 뒤 `admin.html` 에 관리자 비밀번호로 로그인하면
> 다른 기기나 브라우저에서도 같은 문의를 확인할 수 있습니다. 관리자 화면은 5초마다 새 문의를 확인합니다.

### 데이터 저장 및 관리자 보안

- 문의는 `api/inquiries.js` Vercel Function을 통해 **Private Vercel Blob**에 건별 저장됩니다.
- 공개 예약 화면은 문의 등록만 할 수 있습니다. 목록 조회·상태 변경·삭제는 `ADMIN_PASSWORD` 인증이 필요합니다.
- 관리자 비밀번호는 브라우저 탭의 세션 저장소에만 유지되며, 로그아웃하거나 탭을 닫으면 삭제됩니다.
- Vercel 프로젝트에는 Private Blob 연결과 `ADMIN_PASSWORD` 환경 변수가 필요합니다.
- 로컬 개발은 `npm run dev`로 실행하며, 미리보기 관리자 비밀번호는 `preview-password`입니다.

---

## 3. 폴더 구조

```
D:\PT\
├─ index.html
├─ branch.html
├─ instructor.html
├─ before-after.html
├─ reservation.html
├─ admin.html
└─ assets\
   ├─ css\common.css      디자인 시스템 (색상 · 타이포 · 공통 컴포넌트)
   ├─ js\common.js        스크롤 등장 효과 · 탭 · 확대보기 · 예약 데이터 처리
   └─ img\
      ├─ logo-mark.jpg / logo-full.jpg
      ├─ jangan-01 ~ 06         장안점 시설 사진
      ├─ seongnae-01 ~ 07       성내점 시설 사진
      ├─ instructor-lim.jpg     임도영 대표 프로필
      ├─ instructor-shin.jpg    신승현 대표 프로필
      └─ ba\                    ★ Before & After 사진 넣는 곳 (README.txt 참고)
```

---

## 4. 자주 바꾸게 되는 내용

| 바꾸고 싶은 것 | 위치 |
|---|---|
| 운영 시간 | `branch.html` 의 `Hours` 줄 (지점별 각 1곳) |
| 전화번호 | 각 HTML 하단 footer, `tel:` 로 검색 |
| 네이버 플레이스 주소 | `branch.html`, `reservation.html` 의 `naver` 링크 |
| 보유 기구 목록 | `branch.html` 의 `equip__list` |
| 강사 자격 · 경력 | `instructor.html` 의 `cred` 영역 |
| 나이 선택 범위 | `reservation.html` 하단 스크립트 `for (var a = 14; a <= 80; a++)` |
| 브랜드 색상 | `assets/css/common.css` 맨 위 `:root` 의 `--navy`, `--mist`, `--sand` |

---

## 5. 사진 교체

`assets/img/` 안의 파일을 **같은 이름으로 덮어쓰면** 사이트에 바로 반영됩니다.
가로 사진은 1800px, 세로 사진은 1200px 정도 폭을 권장합니다.

Before & After 사진은 `assets/img/ba/README.txt` 의 파일명 규칙을 따라주세요.

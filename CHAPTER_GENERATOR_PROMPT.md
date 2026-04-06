# CHAPTER_GENERATOR_PROMPT.md

> **Đây là prompt template động.** AI tự động điền thông tin từ MEMORY.md và SYSTEM_PROMPT.md — không cần hardcode chapter number hay title.

---

## CÁCH SỬ DỤNG

**Bước 1:** Đính kèm 3 files sau vào context:
- `SYSTEM_PROMPT.md` — context sách, giọng văn, cấu trúc
- `MEMORY.md` — trạng thái hiện tại, chương đã viết, patterns đã introduce
- `CHAPTER_GENERATOR_PROMPT.md` — file này (prompt template)

**Bước 2:** Gửi một trong các lệnh sau:
- `"Viết chương tiếp theo"` — AI đọc MEMORY.md, tự xác định chương cần viết
- `"Viết Chương N"` — AI viết chương cụ thể (kiểm tra MEMORY.md để đảm bảo đúng thứ tự)

**Bước 3:** Sau khi nhận output:
- Lưu vào đúng file path: `docs/partX/chapter-0N.md`
- Cập nhật MEMORY.md theo template ở cuối file đó
- Cập nhật `docs/partX/index.md` — đổi trạng thái chương từ 🔜 sang ✅

---

## ⚠️ QUAN TRỌNG: Xử lý giới hạn token

Nếu chương quá dài (thường là 4.000-8.000+ từ), hãy chia làm 2 lượt:

**Lượt 1 — Phần đầu:**
> Viết Chương N, phần đầu: bao gồm phần mở đầu chương, mục N.1 và N.2. Kết thúc lượt này bằng dòng `<!-- TIẾP THEO: N.3 -->` để tôi biết cần tiếp tục.

**Lượt 2 — Phần cuối:**
> Tiếp tục Chương N từ mục N.3. Viết N.3, N.4 và N.5 (Exercise). Đây là đoạn cuối lượt trước để bạn nắm context: [paste 200 từ cuối của lượt 1]

---

## PROMPT TEMPLATE

---START PROMPT---

Bạn là Lê Văn Tuân, tác giả cuốn "Phát Triển React Hiện Đại với TypeScript 6.0". Tôi đã đính kèm ba file:

1. **SYSTEM_PROMPT.md** — định nghĩa toàn bộ context sách, giọng văn, cấu trúc chương bắt buộc, và quy tắc viết lách.
2. **MEMORY.md** — trạng thái hiện tại: các chương đã viết, CRM Dashboard đang ở đâu, patterns đã introduce.
3. **CHAPTER_GENERATOR_PROMPT.md** — file này, chứa template và quy tắc chất lượng.

---

**NHIỆM VỤ:** Viết chương tiếp theo theo MEMORY.md.

**AI phải tự thực hiện các bước sau:**

1. **Đọc MEMORY.md** → Xác định `Chương tiếp theo cần viết` (số chương + tiêu đề)
2. **Đọc SYSTEM_PROMPT.md** → Tra cứu mục lục (Section 3) để lấy:
   - Tiêu đề chương + 5 mục (N.1 → N.5)
   - Thuộc Phần nào (Part 1/2/3/4)
   - Chương trước và chương sau
   - CRM Dashboard sẽ thêm gì (bảng Section 4)
3. **Tính file output** theo quy tắc:
   - Chương 1-3 → `docs/part1/chapter-0N.md`
   - Chương 4-6 → `docs/part2/chapter-0N.md`
   - Chương 7-9 → `docs/part3/chapter-0N.md`
   - Chương 10-12 → `docs/part4/chapter-NN.md`
4. **Đọc danh sách "Patterns đã introduce"** trong MEMORY.md → Không re-explain, chỉ reference: *"Button component từ Chương 2"*
5. **Đọc danh sách "Thuật ngữ đã giải thích lần đầu"** → Không chú thích lại lần nữa, chỉ dùng trực tiếp

---

**YÊU CẦU BẮT BUỘC:**

1. **Không re-introduce patterns đã có** — Đọc MEMORY.md, section "Patterns đã introduce" của mọi chương trước. Chỉ reference: *"ThemeContext chúng ta xây dựng ở Chương 1"*, *"Card generic từ Chương 2"*.

2. **CRM Dashboard phải evolve** — Chương này thêm gì vào CRM? Mọi code example phải lấy context từ CRM: Customer data, dashboard features, components đã có.

3. **Tuân thủ cấu trúc chương bắt buộc** — Mở đầu (150-250 từ), N.1 → N.4, Exercise N.5, câu kết chuyển sang chương sau.

4. **VitePress Markdown** — Heading levels: `#` cho tên chương, `###` cho mục. Code blocks với filename `[src/...]`. Custom containers (`::: tip`, `::: warning`, `::: danger`, `::: info`) khi phù hợp.

5. **Ngôn ngữ** — Tiếng Việt. Thuật ngữ kỹ thuật giữ tiếng Anh, kèm giải thích trong ngoặc **chỉ ở lần đầu xuất hiện trong chương**. Kiểm tra MEMORY.md "Thuật ngữ đã giải thích lần đầu" — nếu đã giải thích ở chương trước, chỉ cần ghi thuật ngữ tiếng Anh.

6. **Độ sâu senior-level** — Giải thích tại sao pattern tồn tại ở quy mô production, không chỉ how-to. Tránh: "như bạn đã biết...", "React là một...".

7. **Exercise N.5** — Code solution phải đầy đủ, chạy được, không có `// TODO`. Có phần gợi ý trước khi cho xem đáp án.

8. **Sử dụng components/hooks từ chương trước** — Exercise và code examples nên import và sử dụng các component đã xây dựng (`Button`, `Card`, `StatusBadge`, `useAsyncState`, v.v.) để người đọc thấy mọi thứ kết nối.

9. **CSS Variables** — Mọi styling phải dùng CSS variables đã định nghĩa ở Chương 1 (`var(--color-background)`, `var(--color-text-primary)`, v.v.) để dark mode hoạt động đúng.

---

**XÁC NHẬN TRƯỚC KHI VIẾT:**

Trước khi viết nội dung, output đoạn xác nhận ngắn (≤ 3 câu):
- Chương N này tiếp nối chương N-1 như thế nào
- CRM Dashboard sau chương này sẽ có thêm gì
- Pattern/concept quan trọng nhất của chương này

Sau đó bắt đầu viết chương ngay, không hỏi thêm.

---

**SAU KHI VIẾT XONG:**

AI phải tự động cập nhật MEMORY.md theo template ở cuối file đó:
1. Cập nhật `Chương tiếp theo cần viết` → N+1
2. Cập nhật `Số chương đã hoàn thành` → N / 12
3. Thêm entry `### ✅ Chương N: [Tên]` với đầy đủ: nội dung cover, CRM files mới, patterns mới, thuật ngữ mới
4. Cập nhật CRM Dashboard file structure

---END PROMPT---

---

## QUY TẮC CHẤT LƯỢNG (Rút Ra Từ 3 Chương Đã Viết)

### Độ dài & Cấu trúc
- Mỗi chương: **400-700 dòng markdown**, ~4.000-8.000 từ
- Mỗi mục (N.1 → N.4): **80-150 dòng**, bao gồm prose + code + production insight
- Exercise (N.5): **120-200 dòng**, bao gồm yêu cầu + gợi ý + full solution + giải thích
- Mở đầu chương: **2 đoạn văn xuôi** (150-250 từ), không bullet points

### Code Examples
- Mỗi mục **ít nhất 1 code block** có thể chạy, liên quan đến CRM
- Code block luôn có filename comment: ` ```tsx [src/components/X.tsx] `
- Dùng `Customer`, `CustomerListItem`, `CustomerStatus` types đã có — không tạo types mới trùng lặp
- Import paths dùng aliases: `@components/`, `@types/`, `@hooks/`, `@constants/`

### Cross-Chapter References
- Luôn reference components từ chương trước: *"Button component chúng ta xây dựng ở Chương 2"*
- Link relative cho câu kết: `[Chương N+1 →](./chapter-0X)` hoặc `[Chương N+1 →](../partY/chapter-0X)`
- Tránh giải thích lại pattern đã introduce — chỉ *dùng* chúng

### VitePress Containers — Khi Nào Dùng Cái Nào
| Container | Dùng cho |
|-----------|---------|
| `::: tip` | Tips hữu ích, best practices không bắt buộc |
| `::: warning` | Anti-patterns, cạm bẫy phổ biến, deprecation |
| `::: danger` | Lỗi nghiêm trọng, security issues |
| `::: info` | Context lịch sử, lý do thiết kế API |

### Giọng Văn Checklist
- [ ] Không dùng "như bạn đã biết" — giả định người đọc mid-level
- [ ] Có chính kiến — trình bày *một* cách tốt nhất, không liệt kê 5 cách
- [ ] Production insight ở cuối mỗi mục — điều gì khác ở quy mô lớn
- [ ] Dùng prose (văn xuôi) — tránh bullet points quá nhiều trong phần giải thích

---

## CHECKLIST SAU KHI NHẬN OUTPUT

Trước khi lưu file và cập nhật MEMORY.md, kiểm tra:

### Cấu trúc
- [ ] Chương có đủ 5 mục (N.1 → N.5)?
- [ ] Mở đầu chương là 2 đoạn prose, không phải bullet points?
- [ ] Heading levels đúng (`#` cho chương, `###` cho mục)?
- [ ] Có câu chuyển tiếp sang chương sau ở cuối?

### Code
- [ ] Mỗi mục có ít nhất 1 code example TypeScript liên quan đến CRM?
- [ ] Code blocks có filename trong `[...]`?
- [ ] Import paths dùng aliases (`@components/`, `@types/`...)?
- [ ] Exercise N.5 có full solution chạy được, không có `// TODO`?
- [ ] Code sử dụng CSS variables (`var(--color-*)`) cho styling?

### Tính nhất quán
- [ ] Không re-explain patterns đã có trong MEMORY.md?
- [ ] Thuật ngữ đã giải thích ở chương trước không có chú thích lần nữa?
- [ ] Có reference xuyên chương khi dùng component/hook từ chương trước?
- [ ] Tiếng Việt là ngôn ngữ chính, thuật ngữ kỹ thuật giữ tiếng Anh?

### MEMORY.md
- [ ] Đã cập nhật "Chương tiếp theo cần viết"?
- [ ] Đã thêm entry chương mới vào "CHƯƠNG ĐÃ HOÀN THÀNH"?
- [ ] Đã cập nhật CRM Dashboard file structure?

---

## BẢNG THAM CHIẾU NHANH

### Mapping Chương → Part → File

| Chương | Phần | File output |
|--------|------|-------------|
| 1-3 | Phần 1 — Nền Tảng Hiện Đại | `docs/part1/chapter-0N.md` |
| 4-6 | Phần 2 — Advanced Hooks & React 19 | `docs/part2/chapter-0N.md` |
| 7-9 | Phần 3 — Kiến Trúc Production | `docs/part3/chapter-0N.md` |
| 10-12 | Phần 4 — Doanh Nghiệp & Tương Lai | `docs/part4/chapter-NN.md` |

### CSS Variables Có Sẵn (từ Chương 1)

```css
var(--color-background)      /* Nền chính */
var(--color-surface)         /* Nền card/panel */
var(--color-text-primary)    /* Text chính */
var(--color-text-secondary)  /* Text phụ */
var(--color-border)          /* Đường viền */
var(--color-primary)         /* Màu brand */
var(--color-primary-hover)   /* Màu brand hover */
```

### Components/Hooks Có Sẵn (tra MEMORY.md để cập nhật)

> **Luôn đọc MEMORY.md** để biết danh sách chính xác components và hooks đã tạo.
> Dưới đây là ví dụ pattern import:

```tsx
// Components
import Button from '@components/ui/Button';
import Card from '@components/ui/Card';
import StatusBadge from '@components/ui/StatusBadge';

// Hooks & Context
import { useTheme } from '@context/ThemeContext';
import { useAsyncState } from '@hooks/useAsyncState';

// Types
import type { Customer, CustomerListItem, CustomerStatus } from '@types/customer';
import type { AsyncState } from '@types/async';
import type { CustomerFilterState, FilterAction } from '@types/filters';
```

---

## FILE STRUCTURE CHO VITEPRESS

> **Đã thiết lập sẵn.** VitePress project đã được khởi tạo với config tại `docs/.vitepress/config.mts`. Tất cả file chương đã có placeholder — chỉ cần overwrite nội dung.

```
docs/
├── .vitepress/
│   └── config.mts         ← Navigation config (đã cấu hình đầy đủ)
├── index.md               ← Trang chủ (đã có)
├── intro.md               ← Giới Thiệu (đã có)
├── part1/
│   ├── index.md           ← Phần 1 overview (đã có)
│   ├── chapter-01.md      ← Overwrite khi viết xong
│   ├── chapter-02.md
│   └── chapter-03.md
├── part2/
│   ├── index.md
│   ├── chapter-04.md
│   ├── chapter-05.md
│   └── chapter-06.md
├── part3/
│   ├── index.md
│   ├── chapter-07.md
│   ├── chapter-08.md
│   └── chapter-09.md
├── part4/
│   ├── index.md
│   ├── chapter-10.md
│   ├── chapter-11.md
│   └── chapter-12.md
└── conclusion.md
```

Chạy dev server để preview: `npm run docs:dev`

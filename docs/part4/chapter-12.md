# Chương 12: Triển Khai, Tối Ưu Hóa & Migration lên TypeScript 7.0



*Chương này cover:*

- **12.1** Build optimization: Chunk splitting, tree shaking, preloading
- **12.2** Deploy lên Vercel/Netlify với CI/CD pipeline
- **12.3** Environment variables type-safe với Zod
- **12.4** Chuẩn bị cho TypeScript 7.0 (Go-based compiler): những gì thay đổi
- **12.5** Exercise: Deploy CRM hoàn chỉnh đạt Lighthouse 100 (full solution)


Mọi dòng code, mọi dòng Test phủ sóng 100%, mọi kiến trúc Feature Module xịn xò đều trở nên vô nghĩa nếu Website Màn hình CRM của bạn không thể chạy trơn tru trên một chiếc điện thoại kết nối 3G ngoài đại dương mịt mù lưới mạng Web toàn cầu. "Build to Production" là chặng đường đau khổ và đầy thách thức nhất.

Ở chương 9, chúng ta đã tiếp cận Performance trên Khía Cạnh React Runtime (Cách Code Render Màn). Trong chương 12, chặng cuối cùng của cuốn sách, chúng ta sẽ tối ưu hoá trên khía cạnh Network (Các Cục File Bắn Đi), Xây dựng hệ thống đưa Trạng thái tự động (CI/CD) ra đám mây của Vercel, giăng thép gai cho Tệp cấu hình Environment `.env` bằng Zod, và hé mở cánh cửa kỷ nguyên TS 7.0.

Khi gấp cuốn sách lại ở Chương này, bạn không chỉ "Biết Code", bạn chính thức là một Software Architect sẵn sàng nhận Lương Senior.

---

### 12.1 Build Optimization: Lột Xác Gói Bundle 

Hãy nhớ lại cách Vite tạo mã sản phẩm lúc gõ `npm run build`: Vite Engine sẽ cuộn lại toàn bộ Project thành 1 File JS (tạm gọi là gốc) vài megabytes. Tại sao? Trình duyệt cần JS để chạy Logic Code.

Tuy nhiên, trong đống 3MB đó, thư viện Zod chiếm 1MB, Lodash chiếm 500KB. Nếu bạn update Logic Nút Bấm, File Hash đổi, User lại phải down lại trọn bộ 3MB đó!

**Kỹ thuật 1: Vendor Chunk Splitting**

Chúng ta ra lệnh cho Config Build băm nát phần *Thư viện bên thứ ba* thành một Cục (Vendor Chunk) riêng. Bởi vì Thư Viện hiếm khi thay đổi version liên tục nên Browser chép lưu vĩnh viễn trên Ổ cứng!

```ts [vite.config.ts]
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Hoặc React Compiler Plugin đã setup ở Ch.1

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Bất cứ file nào đến từ node_modules, nhét chung vào giỏ 'vendor'
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          // Thậm chí, băm mẹ đẻ React ra một giỏ siêu kín riêng biệt
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
             return 'react-core';
          }
        }
      }
    }
  }
});
```

**Kỹ thuật 2: Xoá Code Chết (Tree Shaking)**

Lý do React 19 và ES6 Module đánh bại CommonJS (`require()`) là Tree Shaking. Khi bạn `import { pick } from 'lodash-es'`, Trình Build có thể tự tay cắt vụn 3900 hàm thừa của Lodash ra ngoài chuỗi Build cuối, chừa đúng hàm `pick`, thu nhỏ size file từ 500KB xuống... 8B. Bí kíp là: Dùng thư viện có đuôi `-es` thay vì bản Base (Cổ) và Đừng sử dụng Default Export khi Export Utility Function!

---

### 12.2 Bảo Vệ Biến Môi Trường (.env) Bằng Mạng Lưới Zod

Đây là lỗ hổng ngớ ngẩn nhất của Senior Devs: App bị ném đỏ màn vì thiếu biến môi trường trong file `.env` Server Production. 

React/Vite đọc biến Môi trường thông qua `import.meta.env.VITE_API_URL`. Tuy nhiên, TypeScript coi điều này thuộc kiểu `string | boolean | any`. Tê liệt hoàn toàn Type Safety!

Và cách tốt nhất để ép Type 100% cho Env biến chính là **Zod** - công cụ chúng ta yêu thích từ Form (Chương 6):

```ts [src/lib/env.ts]
import { z } from 'zod';

// Định hình bộ DNA của hệ Môi Trường
const EnvSchema = z.object({
  VITE_API_URL: z.string().url("Phải là URL hợp lệ, vd: https://api.crm.com"),
  VITE_FEATURE_FLAGS_ENABLED: z.coerce.boolean().default(false),
  VITE_MAX_LOGIN_ATTEMPTS: z.coerce.number().min(3).max(10).default(5),
});

// Chọc vào mảng thô (import.meta.env) để Zod check
const envParse = EnvSchema.safeParse(import.meta.env);

if (!envParse.success) {
  // Lỗi văng ngay lập tức khiến Web tịt lúc Build! Không cấp phép chạy nếu thiếu Key mạng thiết yếu!
  console.error("❌ Lỗi cấu hình Biến Môi Trường (ENV):", envParse.error.format());
  throw new Error("Thiếu biến môi trường thiết yếu để App CRM chạy.");
}

// Bơm ngược bản Type-Safe cho Web xài!
export const ENV = envParse.data;
```

Bây giờ bất kì đâu trong App, gọi: `import { ENV } from '@/lib/env'`, bạn sẽ có Type gợi ý hoàn chỉnh bằng Intellisense kèm tự ép Type Number mà không cần hàm `parseInt()` khó coi!

---

### 12.3 Setup CI/CD Pipeline Lên Chân Mây Vercel

Mỗi lần Update code, bạn chạy Test (Chương 10) trong máy, chạy Build trên máy, rồi mới push. Hãy biến quá trình này thành "Cỗ Máy Tự Động" (Continuous Integration).

Sử dụng Github Actions, mỗi khi bạn Commit Code, nó sẽ đẻ ra con Robot Ubuntu:
1. Đọc Code.
2. Tự gõ `npm run test` và `npx playwright test`. 
3. Nếu code xanh hết, bật lệnh gửi Vercel.

```yml [.github/workflows/deploy.yml]
name: Production Deployment Pipeline

on:
  push:
    branches: ["main"]

jobs:
  test_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Lấy Mã Nguồn
        uses: actions/checkout@v4
        
      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Cài Đặt Thư Viện
        run: npm ci

      - name: Chạy Pháo Đài Test Bắt Lỗi Mềm (Unit/Integration)
        run: npm run test

      - name: Headless Chrome Playwright Test
        run: npx playwright install --with-deps && npx playwright test

      # NẾU TẤT CẢ QUA ẢI TRÊN, MỚI ĐƯỢC CHẠY BUILD & DEPLOY
      - name: Cấu Hình Tự Động Ném Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }} # Nhập Key trên Github Secrets
          vercel-org-id: ${{ secrets.ORG_ID}}
          vercel-project-id: ${{ secrets.PROJECT_ID}}
          vercel-args: '--prod'
```

Quy trình chuẩn kỹ nghệ: Tách Developer hoàn toàn khỏi nút bấm "Phát hành phần mềm". Developer chỉ tập trung Sửa Logic lỗi, Robot lo chất lượng sau cùng.

---

### 12.4 Chuẩn Bị Cho Tương Lai: TS 7.0 Go-Based Compiler

Bạn đang học ở nền tảng TypeScript 6.0 vào năm 2026. Microsoft vừa manh nha công bố kế hoạch cho TS 7.0 - Đại Dịch Chuyển. 
Đây là điều bạn cần biết đễ không bị đào thải:

1. **Trình Dịch Bằng Ngôn Ngữ GO:** Bộ cỗ máy nội tạng viết bằng Node.js của TS suốt nhều thập kỷ đã bị chê là lột xác quá chậm cho các App vĩ đại vài nghìn Folder. TypeScript 7.0 port một phần bộ máy Type-Checker sang Go/Rust. Tốc độ báo chỉ sổ Lỗi trên khung VSC sẽ chớp nhoáng (Sub-millisecond).

2. **Native Type Stripping:** Trong tương lai gần, NodeJs Deno hay thiết lập Vite không cần dùng Plugin Build TS -> JS nữa. Browser / Runtime sẽ hỗ trợ chạy "Làm Mờ Type", nghĩa là Typescript sẽ chỉ báo lỗi lúc bạn Code, còn lúc chạy, Máy ảo sẽ đè bẹp Type văng đi để thực thi trực tiếp, hoàn toàn Không Tốn Time Biên Dịch!

3. **Chống Over-Type (Loại Bỏ Kiểu Đồ Sộ):** Với việc Compiler ép phê, các thói quen Generics lồng ghép 5 tầng (Deep Mapping Generic) sẽ bị Warning gắt gao nhằm tránh chi phí dò bộ nhớ.

Là Architect, hãy viết Type một cách Cà Ràng (Explicit), sử dụng Pattern Zod Infer đã học ở Chương 6. Vì Zod dịch Type ra một cách thẳng đuột, hiệu quả hơn là tự viết Generic uốn lượn hàng trăm dòng. CRM Dashboard của chúng ta đã đi trước thời đại 1 bước.

---

### 12.5 Exercise Cuối Cùng: Chiến Dịch Điểm Sổ Lighthouse 100/100

**Sứ Mệnh Khám Phá Cuối:** Bạn có mọi mảnh xốp trong tay: Code Router, Store, Zod, Test, CI/CD. Mục tiêu cuối là xuất file đạt "Trạng thái Hoàn Mỹ".

**Hành trình Solution Mẫu (Cẩm Nang Áp Dụng):**

1. Khởi động file `vite.config.ts`, bỏ lệnh `manualChunks` như mục 12.1 chia Component `react` và `react-dom` gộp ra cache trình duyệt.
2. Tại file Router gốc thư mục `app/router.tsx` (kiến trúc Features Ch.11), bật toàn bộ chế độ `<Suspense>` kết hợp `React.lazy()` bao cho tuyến CustomersList!
3. Trong thư mục Feature `/customers`, mở Code tìm đúng component Image thẻ Ảnh Avatar User, đổi thành thẻ `<source type="image/webp" />` bọc `<picture>`. Kích hoạt thu tính `loading="lazy"`. 
4. Chạy lệnh: `npm run build` ở local. 
5. Cài phần mềm cục bộ Preview Build: `npm install -g serve` => Chạy `serve -s dist`. Phục rắp Browser cổng 3000.
6. Mở F12 Tab Lighthouse Chrome ẩn danh -> Chạy Check Performance!
7. Điểm 100/100 hiện lên màn hình nhờ LCP giảm dưới 1s, DOM Tree bé tí nhẹ và Blocking CSS bị bóc tách khỏi HTML.
8. Bấm dứt khoát `git push origin main`. Github Robot tự động Pass Test, tự ném qua mạng lưới Edge Network CDN Global của Vercel!

Web Portal CRM của bạn hiện tại sống sót với độ trễ (Latency) 40ms ở bất cứ lãnh thổ quốc gia nào!

### LỜI KẾT
Cuốn sách "Phát Triển React Hiện Đại với TypeScript 6.0" này không dạy bạn cách viết cái Header chữ TO. Nó đem bạn đến đối diện với sự cực khổ của Nghề Kỹ Sư Web thời đại mới: Sự lạm phát quá mức dữ liệu và sự rối ren của State liên Component. Bằng cách trang bị Typescript StrictMode, React Compiler 19 Auto-Memo, Hook Khép Kín Data, Zustand Pattern an toàn, Zod Validation thần bùa và Kiến trúc vách tường Barrel Monorepo: Bạn đã thực sự hoàn thành hành trình từ Vọc vạch Front-end sang Kỹ Sư Lãnh Đạo Dự Án cấp cao.

Đã đến lúc để Lên Sản Phẩm thực sự. Chúc bạn code không biết Bug!
<div align="center"><h4>-- HẾT THẬT RỒI! --</h4></div>

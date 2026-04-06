# MEMORY.md — Trạng Thái Viết Sách

> **Đây là file bộ nhớ.** AI phải đọc file này SAU KHI đọc SYSTEM_PROMPT.md và TRƯỚC KHI bắt đầu viết. File này cho AI biết: đã viết đến đâu, CRM đang ở giai đoạn nào, và pattern nào đã được introduce để không lặp lại.
>
> **Sau mỗi lần AI viết xong một chương**, cập nhật file này theo hướng dẫn ở cuối file.

---

## TRẠNG THÁI HIỆN TẠI

```
Chương tiếp theo cần viết: ĐÃ HOÀN THÀNH TOÀN BỘ SÁCH
Ngày cập nhật cuối: 2026-04-06
Số chương đã hoàn thành: 12 / 12
```

---

## CHƯƠNG ĐÃ HOÀN THÀNH

### ✅ Giới Thiệu (Introduction)
- **File output:** `docs/intro.md`
- **Nội dung đã cover:**
  - Sách dành cho ai (mid-level React devs, full-stack engineers muốn TypeScript)
  - CRM Dashboard là project xuyên suốt (auth simulation, data table, forms, search/filter, performance)
  - Công cụ: Node.js 24 LTS, Git + GitHub CLI, Vite scaffold
  - Cách học: làm từng bước, không copy-paste, commit cuối mỗi phần
- **Giọng văn:** Đã thiết lập tone thực dụng, có chính kiến của tác giả

---

### ✅ Chương 1: Thiết lập dự án nhanh chóng với Vite + React 19.2 + TypeScript 6.0 RC
- **File output:** `docs/part1/chapter-01.md`
- **Nội dung đã cover:**
  - 1.1: Scaffold với `npm create vite@latest`, chọn React + TypeScript
  - 1.2: `tsconfig.json` — strict defaults mới của TS 6.0: `strict: true` (default), `module: esnext`, `target: es2025`, `noUncheckedSideEffectImports`, `libReplacement: false`, `rootDir`, `types: []` (empty default mới)
  - 1.3: Path aliases (`@/`), absolute imports, cấu trúc thư mục `src/components`, `src/hooks`, `src/context`, `src/types`
  - 1.4: React Compiler (`babel-plugin-react-compiler`) — bật trong `vite.config.ts`, verify auto-memoization với React DevTools Profiler
  - 1.5: Exercise — Dark mode toggle với `ThemeContext`, `localStorage` persistence, CSS variables (`--background`, `--text`)
- **CRM Dashboard sau chương 1:**
  - Project scaffold hoàn chỉnh tại `crm-dashboard/`
  - Dark mode hoạt động với `ThemeProvider` wrap toàn app
  - `src/context/ThemeContext.tsx` đã tồn tại
- **Patterns đã introduce:**
  - `createContext` + custom hook pattern (`useTheme`)
  - `useState<Theme>` với union type `'light' | 'dark'`
  - `useEffect` cho side effects (localStorage, classList)
  - `FC<Props>` type annotation cho functional components
- **Thuật ngữ đã giải thích lần đầu:** component (thành phần), props (thuộc tính truyền vào), state (trạng thái), hook, render (kết xuất), memoization (cơ chế ghi nhớ kết quả tính toán), production (môi trường vận hành thực tế)

---

### ✅ Chương 2: Xây dựng component và props an toàn kiểu dữ liệu
- **File output:** `docs/part1/chapter-02.md`
- **Nội dung đã cover:**
  - 2.1: Interface vs type cho props — interface cho extensible/merge, type cho unions/intersections/mapped types. Kết luận: dùng interface cho props đơn giản, type cho complex compositions
  - 2.2: Generic components (`Card<T>` với `renderContent: (item: T) => ReactNode`, `List<T>` với `keyExtractor`)
  - 2.3: `children` prop — `ReactNode` vs `ReactElement` vs `PropsWithChildren`. Khi nào dùng cái nào. Component `Section` và `PageLayout` làm ví dụ
  - 2.4: `satisfies` keyword — bảo toàn literal types. `buttonVariants satisfies Record<ButtonVariant, VariantConfig>`, `statusColors satisfies Record<Status, string>`
  - 2.5: Exercise — Button component đầy đủ (variants, sizes, isLoading, leftIcon/rightIcon, fullWidth, Omit<ButtonHTMLAttributes>) và Card component (union type: simple children | item+renderProps)
- **CRM Dashboard sau chương 2:**
  - `src/components/Button.tsx` — production-ready button với 5 variants, 3 sizes
  - `src/components/Card.tsx` — generic card với header/footer/render props
  - `src/constants/statuses.ts` — `Status` type + `statusColors` map với `satisfies`
  - `src/types/` — đã có folder types (chuẩn bị cho chương sau)
- **Patterns đã introduce:**
  - Generic component pattern (`<T,>`)
  - Render props pattern (`renderContent: (item: T) => ReactNode`)
  - `satisfies` operator
  - `Omit<T, K>` utility type
  - `ButtonHTMLAttributes<HTMLButtonElement>` extends
  - `PropsWithChildren<T>`
- **Thuật ngữ đã giải thích lần đầu:** type safety (an toàn kiểu dữ liệu), inference (suy luận kiểu), generic, boilerplate (code lặp lặp không thêm giá trị)

---

### ✅ Chương 3: Quản lý state với type inference hoàn hảo
- **File output:** `docs/part1/chapter-03.md`
- **Nội dung đã cover:**
  - 3.1: useState — khi nào cần annotate (null union, empty array, subset literal), khi nào để TypeScript tự suy luận (primitive init values). Quy tắc ba câu hỏi.
  - 3.2: useReducer với discriminated unions — `AsyncState<T>` type (idle|loading|success|error), `AsyncAction<T>` union, exhaustiveness checking với `never`, narrowing trong switch/case
  - 3.3: Derived state tính trực tiếp trong render, anti-pattern lưu derived state vào useState + useEffect. React Compiler tự memoize computed values, khi nào vẫn cần useMemo thủ công
  - 3.4: Lifting state đúng cách — state gần nhất nơi dùng, SearchBar + ResultCount + CustomerTable chia sẻ search state qua parent. Dấu hiệu lifting quá mức
  - 3.5: Exercise — CustomerFilterPanel hoàn chỉnh với useReducer: search + status filter + sort + pagination. CustomerFilterState interface, FilterAction discriminated union, derived pipeline (search → status → sort → paginate), exhaustiveness check
- **CRM Dashboard sau chương 3:**
  - `src/types/async.ts` — `AsyncState<T>` discriminated union type
  - `src/types/filters.ts` — `CustomerFilterState`, `FilterAction`, `SortField`, `SortOrder`, `StatusFilter` types
  - `src/reducers/customerFilterReducer.ts` — reducer + `initialFilterState`
  - `src/hooks/useAsyncState.ts` — generic async state hook
  - `src/components/FilteredCustomerList.tsx` — search + derived stats component
  - `src/components/CustomerFilterPanel.tsx` — full filter panel với search, status filter, sort, pagination
  - `src/components/CustomerPage.tsx` — lifted state example với SearchBar + CustomerTable
- **Patterns đã introduce:**
  - Discriminated union cho state (`AsyncState<T>` với `status` discriminant)
  - Discriminated union cho actions (`FilterAction` với `type` discriminant)
  - `useReducer` + discriminated unions = state machine pattern
  - Exhaustiveness checking với `never` trong default case
  - Derived state pattern (computed directly in render, no useState/useMemo)
  - Lifting state pattern với SearchBar/ResultCount/CustomerTable
  - `satisfies` cho option maps (`statusOptions`, `sortFieldLabels`)
- **Thuật ngữ đã giải thích lần đầu:** discriminated union (union phân biệt), narrowing (thu hẹp kiểu), discriminant (trường phân biệt), derived state (trạng thái phái sinh), stale (cũ/lỗi thời), lifting state (nâng state lên component cha), sibling components (component anh em), god object, exhaustiveness checking

---

### ✅ Chương 4: Custom Hooks Giúp Tiết Kiệm Hàng Trăm Dòng Code
- **File output:** `docs/part2/chapter-04.md`
- **Nội dung đã cover:**
  - 4.1: Anatomy của custom hook production-grade, explicit return type, object vs tuple return.
  - 4.2: `useLocalStorage` (type-safe storage persist), `useDebounce` (trì hoãn liên tục input).
  - 4.3: `useFetch` với `AbortController` chống memory leak, generics API data, cleanup hooks.
  - 4.4: Composition Hooks: kết nối các hook đơn thành hook phức tạp. Ví dụ `useDebouncedFetch`, `usePersistentFilters`. Quy tắc hooks chỉ mô tả API cấp cao không qua prop.
  - 4.5: Exercise: Xây dựng `useCustomers` kết hợp `useFetch`, `useDebounce`, `useLocalStorage` quản lý pipelines filter, sort, paginate, stats cho Customer dashboard. Logic hoàn toàn nằm ở data layer, component chỉ handle output.
- **CRM Dashboard sau chương 4:**
  - `src/types/customerHook.ts` — `CustomerFilters`, `CustomerStats`, `UseCustomersReturn` types.
  - `src/hooks/useLocalStorage.ts` — Type-safe local storage hook
  - `src/hooks/useDebounce.ts` — Debounce delay hook
  - `src/hooks/useFetch.ts` — Fetch data API hook
  - `src/hooks/useDebouncedFetch.ts` — Ví dụ Hook Composition
  - `src/hooks/usePersistentFilters.ts` — Ví dụ Hook Composition persist state với reducer
  - `src/hooks/useCustomers.ts` — Hoàn thiện data layer hook cho Customers
  - `src/components/layout/Sidebar.tsx` — Sử dụng `useLocalStorage`
  - `src/components/DebouncedSearch.tsx` — Sử dụng `useDebounce`
  - `src/components/CustomerListAPI.tsx` — Sử dụng `useFetch`
  - `src/components/CustomerDashboard.tsx` — Full UI cho `useCustomers`
- **Patterns đã introduce:**
  - Custom Hook Anatomy (return type clear, interface options object)
  - Return Object over Tuple (Ngoại trừ state)
  - Cleanup / Abort Controller inside `useEffect` (Chống Race conditions / memory leaks)
  - Composition Hooks
  - Data Layer Abstraction (Chuyển logic filter/sort/paginate vào custom hook khỏi UI)
- **Thuật ngữ đã giải thích lần đầu:** explicit return type, tuple, lazy initializer, persistent, debounce, throttle, memory leak, race conditions, abort controller, composition hooks.

---

### ✅ Chương 5: React 19 Actions, Optimistic Updates & Transitions
- **File output:** `docs/part2/chapter-05.md`
- **Nội dung đã cover:**
  - 5.1: `useTransition` / `startTransition` để cô lập logic non-urgent (block trình duyệt). Khác biệt so với Debounce.
  - 5.2: `useOptimistic`: Pattern dự báo tương lai để tránh UX loading dài hạn. Tự xoá shadow state sau khi action done/error.
  - 5.3: Form Actions with `useActionState`: Xử lý Native Form FormData không rườm rà `preventDefault`.
  - 5.4: Suspense Boundaries và Skeleton UI giải quyết tình trạng đứt nét loading component. Tránh Waterfall fetch. 
  - 5.5: Tách `CustomerTable` từ `CustomerDashboard` logic. Apply Nút Xoá Action wrap với `startTransition` và `useOptimistic` để delete item trực tiếp siêu tốc.
- **CRM Dashboard sau chương 5:**
  - `src/components/SearchExample.tsx` — Transition Example
  - `src/components/CustomerStatusUpdater.tsx` — Optimistic Status Toggle (Active/Churned)
  - `src/components/CreateCustomerForm.tsx` — Form Component cho useActionState
  - `src/components/CustomerTable.tsx` — Component cắt ra từ bảng hiển thị cũ. Tích hợp Xóa Data tự Rollback theo `useOptimistic` React 19 API.
- **Patterns đã introduce:**
  - Urgent vs Non-urgent state shift.
  - Action / Transitions boundaries (`startTransition` inside handlers).
  - Shadow state rollback (`useOptimistic`).
  - Async Form Submit handling (`useActionState` replaced `preventDefault`).
  - Skeleton Fallbacks (Suspense bounds).
- **Thuật ngữ đã giải thích lần đầu:** optimistic UI, pessimistic, transitions, urgent vs non-urgent updates, form actions, suspense boundaries, waterfall fetching.

---

### ✅ Chương 6: Forms Không Bao Giờ Hỏng Với Zod + React 19
- **File output:** `docs/part2/chapter-06.md`
- **Nội dung đã cover:**
  - 6.1: Vấn đề validation client-side truyền thống. Zod schema definition và Type Inference mapping 1-1 với form data.
  - 6.2: Combine `useActionState` và `zod.safeParse()`. Error map pattern trả ActionState với `fieldErrors` và `payload`.
  - 6.3: Field level UX: Báo lỗi chính xác từng ô, fallback dirty state từ payload khi submit error.
  - 6.4: Validate File Upload: Type an toàn cho File Object qua Zod `instanceof(File)` và `.refine()`.
  - 6.5: Export reusable design `Input` component. Native DOM reset (`formRef.current.reset()`) sau submit success để triệt tiêu JS state thừa.
- **CRM Dashboard sau chương 6:**
  - `src/types/customerSchema.ts` — Zod Form Schema & Type Inference
  - `src/types/form.ts` — `ActionState` generic Type
  - `src/types/fileUploadSchema.ts` — Zod custom validate upload
  - `src/actions/customerActions.ts` — Form actions API handlers (logic safeParse Zod)
  - `src/components/ui/Input.tsx` — Reusable Form Input Support Error
  - `src/components/forms/CustomerFormZod.tsx` — Form error fields ví dụ
  - `src/components/forms/IntegratedCustomerForm.tsx` — Dashboard Create Action Form mạnh mẽ 
- **Patterns đã introduce:**
  - Zod Single Source of Truth (Schema -> Type).
  - Validation Barrier using Native React Action State.
  - Payload Fallback (Giữ dirty state input thông qua defaultValue).
  - Native DOM Zero Layout Shift Form Reset (`current.reset()`).
  - File Object Zod Refinement.
- **Thuật ngữ đã giải thích lần đầu:** schema declaration, type inference từ schema, single source of truth, dirtystate, fallback payload, hydration.

---

### ✅ Chương 7: Global State An Toàn Kiểu Dữ Liệu, Không Cần Redux
- **File output:** `docs/part3/chapter-07.md`
- **Nội dung đã cover:**
  - 7.1: Redux limitations in 2026. Phân tách Server State (Query) và Client State (Zustand).
  - 7.2: Zustand Store khởi tạo. Core pattern: define state interface before `create`. Selector re-render optimization.
  - 7.3: DevTools và Persist (LocalStorage) middleware trong Zustand.
  - 7.4: Triết lý thiết kế (No Boilerplate, Hook-based provider-less). Anti-pattern data caching = global store.
  - 7.5: Thực hành Store thứ hai `useNotificationStore`. Tích hợp Component render list thông báo `ToastContainer` đứng rời rạc. Tự diệt notification timeout.
- **CRM Dashboard sau chương 7:**
  - `src/store/useAuthStore.ts` — Authentication Store (User role/token) + Middleware persist
  - `src/components/layout/Navbar.tsx` — Layout Header connect Zustand Auth Store
  - `src/store/useNotificationStore.ts` — Array Notification State
  - `src/components/layout/ToastContainer.tsx` — Portal/Fixed div vẽ Notification Toast lơ lửng màn hình
- **Patterns đã introduce:**
  - Hook-based Store (`create<Interface>((set) => (...))`).
  - Zustand Selectors (`useStore(state => state.field)`).
  - Middleware Wrapping (`devtools(persist(...))`).
  - Provider-less Component Connection.
  - Floating UI Array Mapping (Toasts).
- **Thuật ngữ đã giải thích lần đầu:** over-engineering, boilerplate, global state, slices pattern, persistent middleware, selector, prop drilling, garbage collector.

---

### ✅ Chương 8: Routing Với Đầy Đủ Type Safety
- **File output:** `docs/part3/chapter-08.md`
- **Nội dung đã cover:**
  - 8.1: Setup React Router v7 `createBrowserRouter` thay vì cây component rườm rà. Định nghĩa `ROUTES` object centralize (tránh lỗi đánh máy).
  - 8.2: Xây dụng `ProtectedRoute` bọc nhánh System. Check `isAuthenticated` từ Zustand, Redirect và truyền State (Location from) mượt mà.
  - 8.3: Cấu trúc Nested Layout (RootLayout) làm khung cửa ngõ (`<Sidebar>`, `<Navbar>`) bọc quanh `<Outlet>`.
  - 8.4: Parse URL Param Type checking bằng Zod Schema thay vì `useParams()` lỏng lẻo. 
  - 8.5: Full Exercise cấu thành hệ thống. Component Link `NavLink` active background tự động. Gom hết RouterProvider, Zustand middleware và ToastPortal vào một `App.tsx` gốc gọn nhẹ.
- **CRM Dashboard sau chương 8:**
  - `src/routes/config.ts` — Từ điển String constants cho Routes
  - `src/routes/ProtectedRoute.tsx` — Vệ Sĩ chặn cửa React Router có chọc Zustand
  - `src/router.tsx` — File rễ chứa bảng định nghĩa Array mapping Component 
  - `src/pages/RootLayout.tsx` — Tổ chức Khung Grid hệ thống
  - `src/pages/CustomerDetailPage.tsx` — View con sử dụng lấy Param qua Zod
  - `src/components/layout/Sidebar.tsx` — Active Links implementation
  - `src/App.tsx` — File gốc tráo ghép Provider
- **Patterns đã introduce:**
  - File-based router config map.
  - Protected Wrapper Boundary. 
  - Zod Parameters parsing.
  - Constant Navigation pathing.
  - NavLink isActive destructuring. 
- **Thuật ngữ đã giải thích lần đầu:** nested layouts, file-based routing, outlet, waterfalls navigation, type assertion.

---

### ✅ Chương 9: Performance Thực Sự Có Ý Nghĩa
- **File output:** `docs/part3/chapter-09.md`
- **Nội dung đã cover:**
  - 9.1: Cách dùng React Profiler đo re-render CPU và Lighthouse đo LCP / INP. 
  - 9.2: Tách bundle Size bằng code-splitting. Áp dụng `React.lazy` và `Suspense` cho tầng Router để defer code js.
  - 9.3: Xử lý Big Data List khổng lồ với `@tanstack/react-virtual`, tạo engine vẽ bảng 10k item chỉ bằng 15 record DOM.
  - 9.4: Tối ưu WebVitals: `loading="lazy"` cho ảnh xa, `font-display: swap` chống chớp font trắng. Checklist x-ray performance.
- **CRM Dashboard sau chương 9:**
  - `src/router.tsx` — Chuyển qua Dynamic Import (lazy load).
  - `src/components/CustomerTableVirtual.tsx` — Nâng cấp bảng khách hàng lên dạng Grid Ảo hóa (Virtual Rendering).
- **Patterns đã introduce:**
  - Route-based Splitting.
  - DOM Virtualization (Ánh xạ 1D).
  - Lazy loading HTML tags.
- **Thuật ngữ đã giải thích lần đầu:** profiler, flamegraph, single page application, dynamic import, virtualization, LCP, INP.

---

### ✅ Chương 10: Chiến Lược Testing Không Thể Phá Vỡ
- **File output:** `docs/part4/chapter-10.md`
- **Nội dung đã cover:**
  - 10.1: Phân loại Testing Pyramid (Unit, Integration, E2E) trong kỷ nguyên React mới. Ưu tiên Integration.
  - 10.2: `vitest` và `@testing-library/react`. Hướng dẫn test component theo tư duy UX (User Event, Role query) tránh Fragile test.
  - 10.3: `msw` (Mock Service Worker). Đánh lừa lệnh Fetch Node.js tầng Network thay vì mock function lỏng lẻo. 
  - 10.4: `playwright` cho luồng E2E automation test giả lập thao tác click chuột/typing Chrome.
  - 10.5: Exercise: Viết luồng Integration dùng MSW quăng 500 Error để kích hoạt React 19 Error Boundary & Rollback Optimistic UI.
- **CRM Dashboard sau chương 10:**
  - `src/mocks/handlers.ts` — Trạm trung chuyển API MSW
  - `src/components/ui/__tests__/Input.test.tsx` — RTL Test UI component
  - `src/components/__tests__/CustomerTableOptimistic.test.tsx` — Integration test full luồng xóa data
  - `playwright/e2e/customer-flow.spec.ts` — Kịch bản chạy ma Chromium kiểm duyệt Route
- **Patterns đã introduce:**
  - Testing behavior over implementation (UX centric querying).
  - Network request Interception (MSW).
  - Headless E2E flow.
- **Thuật ngữ đã giải thích lần đầu:** regression, test coverage, testing pyramid, e2e, fragile test, assertion.

---

### ✅ Chương 11: Cấu Trúc Dự Án Có Thể Mở Rộng Cho Nhóm Phát Triển
- **File output:** `docs/part4/chapter-11.md`
- **Nội dung đã cover:**
  - 11.1: Khác biệt cốt lõi Layer-Based vs Feature-Based (Cohesion vs Fragmentation). 
  - 11.2: Barrel Exports (Public API vách ngăn) giải quyết Circular Dependency trong Team lớn. Chống Import đâm xuyên ruột.
  - 11.3: Storybook Init: Cô lập UI components (Design System) qua môi trường Playgroud, tránh chỉnh sửa bừa bãi.
  - 11.4: Monorepo Architecture. Turborepo pipeline build cache, chia sẻ Packages (@mycomp/ui) giữa Web App và CRM.
  - 11.5: Exercise: Đập đi xây lại File Tree. Nhét Customer list, Auth vào folder Modules chuẩn bị cho Micro-frontends tương lai.
- **CRM Dashboard sau chương 11:**
  - `src/features/customers/index.ts` — Vách ngăn an toàn nhóm Customer
  - `src/features/auth/index.ts` — Vách ngăn Auth
  - (Cấu trúc Thư mục hoàn toàn bị thay đổi so với các Chương 1-10)
  - `src/components/ui/Button.stories.tsx` — Định dạng Storybook
- **Patterns đã introduce:**
  - Bounded Context (Khu vực phân cách tính năng).
  - Barrel Export (Tường lửa public `index.ts`).
  - Monorepo Packaging.
- **Thuật ngữ đã giải thích lần đầu:** cohesion, barrel export, circular dependency, storybook, design system, monorepo, turborepo, bounded context.

---

### ✅ Chương 12: Triển Khai, Tối Ưu Hóa & Chuẩn Bị Migration
- **File output:** `docs/part4/chapter-12.md`
- **Nội dung đã cover:**
  - 12.1: Vite Build Optimization. Sử dụng `manualChunks` băm nát Vendor library chống tải lại file lớn. Kĩ thuật Tree-Shaking bằng module `es`.
  - 12.2: Tường lửa biến môi trường. Dùng Zod ép Type an toàn cho `import.meta.env` cắt đứt nguy cơ đỏ màn production do lọt biến.
  - 12.3: CI/CD Pipeline. Viết kịch bản `.github/workflows` chạy Vitest, Playwright tự động trước khi thả mã lên Cloudflare/Vercel.
  - 12.4: Tổng kết tầm nhìn về Typescript 7.0 (Go Native Compiler). Hướng tới Native Type Stripping chống Deep generic.
  - 12.5: Campaign chốt sổ quy trình Audit Web đạt Lighthouse 100/100 LCP bằng thẻ thư viện Lazyload Image native.
- **CRM Dashboard sau chương 12:**
  - `vite.config.ts` — Thêm cấu hình build Chunk.
  - `src/lib/env.ts` — Logic validate Environment.
  - `.github/workflows/deploy.yml` — Hệ thống Robot Deploy.
- **Patterns đã introduce:**
  - Vendor Chunk Splitting.
  - Type-safe ENV.
  - Continious Deployment (CI/CD Automations).
- **Thuật ngữ đã giải thích lần đầu:** Tree-shaking, vendor chunk, continuous integration (CI), environment variables, typescript 7.0 go compiler.

---

## CRM DASHBOARD — TRẠNG THÁI HIỆN TẠI

### File structure MỚI (Từ Chương 11 - Feature Based):
```
crm-dashboard/
├── packages/                  (Mô phỏng Turborepo Shared)
│   └── ui-components/         (Button, Card, Input)
├── apps/
│   └── web-crm/
│       ├── src/
│       │   ├── app/           (App.tsx, router.tsx trượt vào đây)
│       │   ├── components/    (Global Layout: Sidebar, Navbar rút gọn)
│       │   ├── features/      👉 THE CORE
│       │   │   ├── auth/      (Zustand store, LoginPage form)
│       │   │   └── customers/ (Dashboard, API hooks, Zod Schema Khách hàng)
│       │   └── lib/           (MSW Setup, Zod helpers)
│       ├── playwright/        (E2E Tests)
│       ├── .github/
│       │   └── workflows/
│       │       └── deploy.yml (CI/CD Pipeline Ch.12)
│       ├── tsconfig.json
│       ├── src/lib/env.ts     (Type safe ENVs Ch.12)
│       └── vite.config.ts     (Build Optimization Ch.12)
```
│   │   └── statuses.ts               ✅ (Ch.2)
│   ├── context/
│   │   └── ThemeContext.tsx          ✅ (Ch.1)
│   ├── hooks/
│   │   ├── useAsyncState.ts          ✅ (Ch.3)
│   │   ├── useLocalStorage.ts        ✅ (Ch.4)
│   │   ├── useDebounce.ts            ✅ (Ch.4)
│   │   ├── useFetch.ts               ✅ (Ch.4)
│   │   ├── useDebouncedFetch.ts      ✅ (Ch.4)
│   │   ├── usePersistentFilters.ts   ✅ (Ch.4)
│   │   └── useCustomers.ts           ✅ (Ch.4)
│   ├── reducers/
│   │   └── customerFilterReducer.ts  ✅ (Ch.3)
│   ├── types/
│   │   ├── customer.ts               ✅ (Ch.1)
│   │   ├── async.ts                  ✅ (Ch.3)
│   │   ├── filters.ts                ✅ (Ch.3)
│   │   ├── customerHook.ts           ✅ (Ch.4)
│   │   ├── customerSchema.ts         ✅ (Ch.6)
│   │   ├── form.ts                   ✅ (Ch.6)
│   │   └── fileUploadSchema.ts       ✅ (Ch.6)
│   ├── actions/
│   │   └── customerActions.ts        ✅ (Ch.6)
│   ├── routes/
│   │   ├── config.ts                 ✅ (Ch.8)
│   │   └── ProtectedRoute.tsx        ✅ (Ch.8)
│   ├── pages/
│   │   ├── RootLayout.tsx            ✅ (Ch.8)
│   │   ├── LoginPage.tsx             ✅ (Ch.8)
│   │   ├── DashboardPage.tsx         ✅ (Ch.8)
│   │   ├── CustomersListPage.tsx     ✅ (Ch.8)
│   │   ├── CustomerDetailPage.tsx    ✅ (Ch.8)
│   │   └── ErrorPage.tsx             ✅ (Ch.8)
│   ├── store/
│   │   ├── useAuthStore.ts           ✅ (Ch.7)
│   │   └── useNotificationStore.ts   ✅ (Ch.7)
│   ├── App.tsx                       ✅ (Ch.8 — Update Global Layout)
│   ├── router.tsx                    ✅ (Ch.8)
│   ├── main.tsx                      ✅ (Ch.1 — ThemeProvider wrap)
│   └── index.css                     ✅ (Ch.1 — CSS variables)
├── playwright/
│   └── e2e/
│       └── customer-flow.spec.ts     ✅ (Ch.10)
├── tsconfig.json                     ✅ (Ch.1 — TS 6.0 strict defaults)
└── vite.config.ts                    ✅ (Ch.1 — React Compiler enabled)
```

### Dữ liệu/Types chưa có (cần tạo trong chương tiếp theo):
- **TẤT CẢ TÍNH NĂNG ĐÃ ĐƯỢC PHỦ HOÀN TOÀN TỪ CHƯƠNG 1 ĐẾN 12.** Mọi hệ sinh thái CRM Dashboard Đã xong!

---

## HƯỚNG DẪN CẬP NHẬT FILE NÀY SAU MỖI CHƯƠNG

Sau khi AI viết xong một chương, người dùng (hoặc AI) cập nhật file này theo template:

```markdown
### ✅ Chương N: [Tên chương]
- **File output:** `docs/partX/chapter-0N.md`
- **Nội dung đã cover:**
  - N.1: [tóm tắt 1 câu]
  - N.2: [tóm tắt 1 câu]
  - N.3: [tóm tắt 1 câu]
  - N.4: [tóm tắt 1 câu]
  - N.5: Exercise — [mô tả bài tập và solution]
- **CRM Dashboard sau chương N:**
  - [Liệt kê files mới thêm vào]
  - [Mô tả tính năng mới]
- **Patterns đã introduce:**
  - [Pattern 1]
  - [Pattern 2]
- **Thuật ngữ đã giải thích lần đầu:** [danh sách]
```

Và cập nhật phần **TRẠNG THÁI HIỆN TẠI** ở đầu file:
- `Chương tiếp theo cần viết: Chương [N+1]`
- `Số chương đã hoàn thành: [N] / 12`

Và cập nhật phần **CRM DASHBOARD — TRẠNG THÁI HIỆN TẠI** với các files mới.

---

## LƯU Ý QUAN TRỌNG CHO AI

1. **Không tái giải thích** các pattern đã introduce (có dấu ✅ trong Memory). Chỉ dùng chúng mà không cần giải thích lại từ đầu.

2. **Tham chiếu cross-chapter**: Khi dùng một component/hook từ chương trước, ghi rõ: *"Button component chúng ta xây dựng ở Chương 2"* — để người đọc thấy mọi thứ kết nối.

3. **CRM phải evolve**: Mỗi chương phải để lại dấu ấn rõ ràng trong CRM Dashboard. Nếu chương đó không thêm gì vào CRM, đó là dấu hiệu nội dung quá abstract.

4. **File output naming convention:**
   - Giới thiệu: `docs/intro.md`
   - Chương 1-3: `docs/part1/chapter-01.md`, `chapter-02.md`, `chapter-03.md`
   - Chương 4-6: `docs/part2/chapter-04.md`, ...
   - Chương 7-9: `docs/part3/chapter-07.md`, ...
   - Chương 10-12: `docs/part4/chapter-10.md`, ...
   - Kết luận: `docs/conclusion.md`

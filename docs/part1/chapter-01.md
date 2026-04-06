# Chương 1: Thiết Lập Dự Án Nhanh Chóng với Vite + React 19.2 + TypeScript 6.0 RC



*Chương này cover:*

- **1.1** Tạo template Vite + React 19 + TS 6.0 RC
- **1.2** Strict defaults của `tsconfig.json` và các flag mới trong 6.0
- **1.3** Path aliases, absolute imports, và cấu trúc thư mục chuẩn
- **1.4** React Compiler: bật và xác minh auto-memoization
- **1.5** Exercise: Thêm dark mode toggle (full solution)


Tốc độ khởi động dự án không chỉ là vấn đề tiện lợi — nó ảnh hưởng trực tiếp đến chất lượng kiến trúc. Khi scaffolding (khởi tạo nhanh dự án) tốn quá nhiều thời gian hoặc cấu hình quá phức tạp, lập trình viên có xu hướng chấp nhận các thiết lập mặc định không phù hợp, bỏ qua strict mode, và tích lũy technical debt (nợ kỹ thuật) ngay từ commit đầu tiên. Chương này giải quyết điều đó bằng cách xây dựng một môi trường phát triển không chỉ *hoạt động được* mà còn được thiết kế có chủ ý — với TypeScript 6.0 RC ở chế độ nghiêm ngặt nhất, React Compiler tự động tối ưu hóa render (kết xuất), và một cấu trúc thư mục có thể mở rộng khi dự án phát triển từ một người lên một nhóm.

Cuối chương này, bạn sẽ có nền tảng vận hành được của CRM Dashboard — một ứng dụng quản lý quan hệ khách hàng mà chúng ta sẽ xây dựng và tinh chỉnh xuyên suốt toàn bộ cuốn sách. Mỗi quyết định thiết lập trong chương này đều có lý do tồn tại ở quy mô production (môi trường vận hành thực tế), và tôi sẽ giải thích từng quyết định đó.

---

### 1.1 Tạo Template Vite + React 19 + TypeScript 6.0

Vite đã thay thế Create React App như một chuẩn mực thực tế trong ngành không phải vì marketing, mà vì nó giải quyết đúng vấn đề: thời gian khởi động server phát triển không phụ thuộc vào kích thước dự án. Trong khi các bundler (công cụ đóng gói) truyền thống phải xử lý toàn bộ dependency graph (đồ thị phụ thuộc) trước khi phục vụ bất kỳ file nào, Vite phục vụ module gốc của trình duyệt và chỉ transform (chuyển đổi) file khi có yêu cầu. Ở quy mô một CRM với hàng chục component và hàng trăm dependencies, sự khác biệt đó là vài giây so với vài mươi giây mỗi lần khởi động.

Đảm bảo Node.js 22+ đã được cài đặt (Node.js 24 LTS là lựa chọn khuyến nghị tính đến 2026), sau đó chạy:

```bash
npm create vite@latest crm-dashboard -- --template react-ts
cd crm-dashboard
npm install
```

Flag `--template react-ts` tạo project với TypeScript đã được cấu hình sẵn. Tuy nhiên, đây là TypeScript ở cấu hình mặc định — chưa phải TypeScript 6.0. Cài đặt RC (Release Candidate — phiên bản ứng viên phát hành) ngay bây giờ:

```bash
npm install -D typescript@rc
```

Xác nhận phiên bản:

```bash
npx tsc --version
# Nên hiển thị: Version 6.0.0-rc.x
```

Khởi động server phát triển:

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:5173`. Bạn sẽ thấy trang chào mừng mặc định của Vite — đây là điểm xuất phát. Cấu trúc file được tạo ra trông như sau:

```
crm-dashboard/
├── public/
├── src/
│   ├── assets/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

Cấu trúc này là điểm khởi đầu tốt, nhưng chúng ta sẽ tái tổ chức nó ở mục 1.3 để phù hợp với quy mô enterprise. Trước tiên, hãy làm cho TypeScript thực sự hoạt động đúng cách.

---

### 1.2 Strict Defaults của `tsconfig.json` và Các Flag Mới trong TypeScript 6.0

`tsconfig.json` là hợp đồng giữa bạn và trình biên dịch TypeScript. Cấu hình lỏng lẻo không chỉ bỏ sót lỗi — nó tạo ra một lớp an toàn ảo khiến bạn tin rằng code an toàn hơn thực tế. TypeScript 6.0 RC thay đổi một số default (giá trị mặc định) theo hướng nghiêm ngặt hơn, và hiểu rõ từng thay đổi đó là điều kiện để bạn kiểm soát được trình biên dịch thay vì để trình biên dịch kiểm soát bạn.

Thay thế nội dung `tsconfig.json` mặc định bằng cấu hình sau:

```json [tsconfig.json]
{
  "compilerOptions": {
    "target": "es2025",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["es2025", "dom", "dom.iterable"],

    "strict": true,
    "noUncheckedSideEffectImports": true,
    "libReplacement": false,

    "jsx": "react-jsx",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node", "vite/client"],

    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Hãy đi qua từng thay đổi quan trọng so với các phiên bản trước.

**`target: "es2025"` và `module: "esnext"`**

TypeScript 6.0 nâng target mặc định lên `es2025`. Điều này có nghĩa là trình biên dịch sẽ không downgrade (hạ cấp) các tính năng JavaScript hiện đại — Vite và các trình duyệt hiện đại sẽ xử lý chúng trực tiếp. Đừng dùng `es5` hay `es6` trừ khi bạn đang hỗ trợ trình duyệt cổ lỗi thật sự.

**`strict: true` — giờ là default**

Trong TypeScript 6.0, `strict: true` là mặc định. Bạn không cần khai báo nó nữa, nhưng tôi giữ lại để tường minh. Flag này bật một tập hợp các kiểm tra bao gồm `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, và nhiều hơn nữa. Trong context của React, điều này có nghĩa là props và state phải được type rõ ràng — `undefined` không thể âm thầm lọt qua.

**`noUncheckedSideEffectImports: true` — flag mới trong 6.0**

Đây là thay đổi hành vi quan trọng nhất của TypeScript 6.0. Khi bật, TypeScript sẽ báo lỗi nếu bạn import một file không có type declarations mà chỉ có side effects (hiệu ứng phụ). Ví dụ điển hình là CSS imports:

```tsx
// Trước TypeScript 6.0: không có lỗi
import './styles/global.css';

// Với noUncheckedSideEffectImports: true — TypeScript sẽ
// cần kiểm tra xem file có tồn tại và được khai báo không
```

Để CSS imports hoạt động đúng, bạn cần đảm bảo `vite-env.d.ts` tồn tại trong `src/` với nội dung:

```ts [src/vite-env.d.ts]
/// <reference types="vite/client" />
```

File này khai báo type cho CSS modules, SVG imports, và các asset khác mà Vite xử lý — đây là lý do `types: ["vite/client"]` xuất hiện trong tsconfig.

**`libReplacement: false` — tối ưu hóa thời gian type-check**

TypeScript 6.0 giới thiệu cơ chế lib replacement cho phép thay thế các built-in type libraries. Đặt thành `false` để Vite và TypeScript không lãng phí thời gian phân giải các thư viện không cần thiết trong quá trình phát triển.

**`types: ["node", "vite/client"]` — explicit type declarations**

Trước đây, TypeScript tự động bao gồm tất cả packages trong `@types/`. TypeScript 6.0 thay đổi mặc định thành array rỗng `[]`. Điều này có vẻ bất tiện nhưng thực ra là đúng đắn: không có lý do gì để type declarations của Node.js xuất hiện trong một React component chạy trên trình duyệt.

**`moduleResolution: "bundler"` — dành riêng cho Vite**

Đây là mode resolution được thiết kế cho các công cụ như Vite và esbuild. Nó cho phép import file không có extension, hỗ trợ package.json `exports`, và hoạt động chính xác với cách Vite phân giải module. Đừng dùng `"node"` hay `"node16"` cho dự án Vite.

**Kiểm tra cấu hình:**

```bash
npx tsc --noEmit
```

Nếu không có lỗi, cấu hình đã hoạt động. Nếu thấy lỗi liên quan đến `@types/node` chưa được cài đặt:

```bash
npm install -D @types/node
```

::: warning Deprecated trong TypeScript 6.0
Các option sau đây sẽ gây ra warning trong 6.0 và trở thành lỗi trong TypeScript 7.0. Xóa chúng khỏi tsconfig ngay nếu có:
- `"target": "es5"` — dùng `"es2015"` trở lên
- `"moduleResolution": "node"` — dùng `"bundler"` hoặc `"nodenext"`
- `"baseUrl"` dùng cho path lookup — dùng `"paths"` thay thế

Để tạm thời tắt deprecation warnings khi đang migration (di chuyển):
```json
{ "ignoreDeprecations": "6.0" }
```
:::

---

### 1.3 Path Aliases, Absolute Imports, và Cấu Trúc Thư Mục Chuẩn

Một trong những dấu hiệu sớm nhất của một codebase sẽ trở nên khó bảo trì là relative import (import tương đối) lồng nhau sâu:

```tsx
// Đây là dấu hiệu của một codebase đang mất kiểm soát
import { Button } from '../../../components/ui/Button';
import { useCustomers } from '../../../../hooks/useCustomers';
import type { Customer } from '../../../../../types/customer';
```

Khi file di chuyển vị trí — điều xảy ra thường xuyên trong quá trình refactor — mọi import phải được cập nhật thủ công. Path aliases (bí danh đường dẫn) giải quyết vấn đề này triệt để.

**Cấu hình path aliases**

Thêm `paths` vào `tsconfig.json` trong `compilerOptions`:

```json [tsconfig.json]
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@store/*": ["./src/store/*"],
      "@types/*": ["./src/types/*"],
      "@utils/*": ["./src/utils/*"],
      "@constants/*": ["./src/constants/*"],
      "@pages/*": ["./src/pages/*"]
    }
  }
}
```

::: info Tại sao `baseUrl` cần thiết khi dùng `paths`?
`paths` trong TypeScript là tương đối so với `baseUrl`. Nếu không khai báo `baseUrl`, TypeScript không biết tính đường dẫn từ đâu. Với `"baseUrl": "."`, tất cả paths được tính từ thư mục chứa `tsconfig.json`, tức là root của project.
:::

TypeScript hiểu aliases này cho type-checking, nhưng Vite cần được thông báo riêng để bundler cũng phân giải đúng. Cập nhật `vite.config.ts`:

```ts [vite.config.ts]
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@pages': path.resolve(__dirname, './src/pages'),
    },
  },
});
```

Sau khi cấu hình, import trước đây trở thành:

```tsx
// Sạch, rõ ràng, không quan tâm file nằm ở đâu trong cây thư mục
import { Button } from '@components/ui/Button';
import { useCustomers } from '@hooks/useCustomers';
import type { Customer } from '@types/customer';
```

**Cấu trúc thư mục cho CRM Dashboard**

Bây giờ hãy tạo cấu trúc thư mục sẽ là nhà của toàn bộ ứng dụng xuyên suốt cuốn sách này. Cấu trúc này được thiết kế theo nguyên tắc *feature co-location* (gom code theo tính năng) ở layer cao nhất, nhưng chia sẻ các primitive (thành phần nguyên thủy) tái sử dụng ở các thư mục shared:

```bash
mkdir -p src/{components/{ui,layout,shared},hooks,pages,store,types,utils,constants,context}
```

Kết quả:

```
src/
├── components/
│   ├── ui/           ← Button, Card, Input, Badge, Modal...
│   ├── layout/       ← Sidebar, Header, PageLayout...
│   └── shared/       ← Components dùng chung nhưng domain-specific
├── constants/        ← Status enums, config constants...
├── context/          ← React contexts (ThemeContext, v.v.)
├── hooks/            ← Custom hooks tái sử dụng
├── pages/            ← Page-level components (sẽ dùng từ Ch.8)
├── store/            ← Zustand stores (sẽ dùng từ Ch.7)
├── types/            ← TypeScript type và interface definitions
└── utils/            ← Pure utility functions
```

Tạo file đầu tiên trong hệ thống này — type definition cho Customer, entity trung tâm của toàn bộ CRM:

```ts [src/types/customer.ts]
export type CustomerStatus = 'active' | 'inactive' | 'prospect' | 'churned';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  status: CustomerStatus;
  createdAt: string; // ISO 8601 date string
  lastContactedAt?: string;
  notes?: string;
}

export interface CustomerListItem
  extends Pick<Customer, 'id' | 'name' | 'email' | 'company' | 'status'> {
  // Subset dùng cho danh sách — không cần toàn bộ data khi hiển thị bảng
}
```

::: tip Tại sao tách `CustomerListItem`?
Trong một API thực tế, endpoint trả về danh sách (`GET /customers`) thường trả về ít trường hơn endpoint chi tiết (`GET /customers/:id`) để giảm payload. Định nghĩa hai type riêng biệt từ đầu — thay vì dùng `Customer` cho cả hai — giúp TypeScript bắt lỗi ngay khi bạn vô tình truy cập field chỉ có trong chi tiết từ một component chỉ nhận list item.
:::

Kiểm tra path aliases hoạt động bằng cách tạo một import test trong `App.tsx`:

```tsx [src/App.tsx]
import type { Customer } from '@types/customer';

// Nếu TypeScript không báo lỗi, path alias đã hoạt động đúng
const _typeCheck: Customer = {
  id: '1',
  name: 'Nguyễn Văn A',
  email: 'a@example.com',
  company: 'Công ty ABC',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
};

export default function App() {
  return <div>CRM Dashboard</div>;
}
```

Chạy `npx tsc --noEmit` — không có lỗi là thành công.

---

### 1.4 React Compiler: Bật và Xác Minh Auto-Memoization

Memoization thủ công là một trong những nguồn bug tinh vi nhất trong React. Khi một lập trình viên viết `useMemo`, `useCallback`, hay `React.memo`, họ đang đưa ra một cam kết về dependency (phụ thuộc) — cam kết mà compiler không kiểm tra và rất dễ sai. React Compiler, trở thành stable (ổn định) trong React 19.2, tiếp cận vấn đề từ một góc độ khác hoàn toàn: thay vì để lập trình viên quyết định *khi nào* cần memoize, compiler phân tích tĩnh code của bạn và tự quyết định.

Đây không phải là "tối ưu hóa miễn phí" theo nghĩa nó sẽ làm mọi thứ nhanh hơn một cách thần kỳ. Đây là sự dịch chuyển về trách nhiệm: thay vì lập trình viên phải nhớ wrap function prop trong `useCallback`, compiler đảm bảo điều đó xảy ra đúng mọi lúc, không có ngoại lệ.

**Cài đặt**

```bash
npm install react@19.2 react-dom@19.2
npm install -D babel-plugin-react-compiler eslint-plugin-react-compiler
```

ESLint plugin quan trọng không kém: nó báo lỗi khi code của bạn vi phạm các quy tắc mà compiler cần để hoạt động đúng (ví dụ: mutation object hay array trực tiếp thay vì tạo bản sao mới).

Tạo hoặc cập nhật `.eslintrc.cjs`:

```js [.eslintrc.cjs]
module.exports = {
  plugins: ['react-compiler'],
  rules: {
    'react-compiler/react-compiler': 'error',
  },
};
```

Cập nhật `vite.config.ts` để bật compiler (bạn đã thấy cấu hình này ở mục 1.3, đây là phiên bản đầy đủ):

```ts [vite.config.ts]
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      babel: {
        // React Compiler chạy như một Babel plugin trong quá trình build
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // ... các alias khác
    },
  },
});
```

**Xác minh auto-memoization**

Để thấy compiler hoạt động cụ thể, tạo một cặp parent-child component (component cha-con) đơn giản. Pattern này — parent cập nhật state thường xuyên trong khi child nhận props tĩnh — là kịch bản kinh điển cho memoization:

```tsx [src/components/shared/StaticPanel.tsx]
import { FC } from 'react';

interface StaticPanelProps {
  title: string;
  subtitle: string;
}

// Component này không phụ thuộc vào bất kỳ state động nào từ parent.
// Không có React Compiler: re-render mỗi khi parent render.
// Có React Compiler: được memoize tự động, chỉ render khi props thay đổi.
const StaticPanel: FC<StaticPanelProps> = ({ title, subtitle }) => {
  console.log('[StaticPanel] rendered');
  return (
    <div className="panel">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
};

export default StaticPanel;
```

```tsx [src/App.tsx]
import { FC, useState } from 'react';
import StaticPanel from '@components/shared/StaticPanel';

const App: FC = () => {
  const [tick, setTick] = useState(0);

  return (
    <div>
      <p>Tick: {tick}</p>
      <button onClick={() => setTick((t) => t + 1)}>
        Cập nhật parent state
      </button>

      {/* StaticPanel nhận props không thay đổi */}
      <StaticPanel
        title="CRM Dashboard"
        subtitle="Quản lý quan hệ khách hàng"
      />
    </div>
  );
};

export default App;
```

Mở browser console và click nút nhiều lần. Với React Compiler hoạt động đúng, `[StaticPanel] rendered` chỉ xuất hiện **một lần** — ở lần render đầu tiên. Mọi lần click tiếp theo cập nhật `tick` trong parent nhưng StaticPanel không re-render vì props không thay đổi.

**Xác minh với React DevTools**

Cài đặt React DevTools extension cho trình duyệt nếu chưa có. Mở DevTools → tab **Profiler** → nhấn nút ghi → click button vài lần → dừng ghi. Trong flamegraph (biểu đồ ngọn lửa), `StaticPanel` sẽ không bị highlight màu vàng/cam trong các lần render sau, xác nhận nó được bỏ qua.

::: warning Khi compiler không thể memoize
React Compiler hoạt động dựa trên nguyên tắc immutability (tính bất biến). Nếu component của bạn mutate (thay đổi trực tiếp) object hay array, compiler không thể đảm bảo an toàn và sẽ từ chối optimize. Ví dụ phổ biến:

```tsx
// ❌ Compiler sẽ skip component này
const BadComponent: FC<{ items: string[] }> = ({ items }) => {
  items.push('new item'); // Mutation trực tiếp — vi phạm Rules of React
  return <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>;
};

// ✅ Đúng cách — tạo bản sao mới
const GoodComponent: FC<{ items: string[] }> = ({ items }) => {
  const withNew = [...items, 'new item']; // Immutable update
  return <ul>{withNew.map(i => <li key={i}>{i}</li>)}</ul>;
};
```

ESLint plugin `eslint-plugin-react-compiler` sẽ cảnh báo về các vi phạm như thế này trong quá trình phát triển.
:::

Sau khi cài đặt, CRM Dashboard của bạn được hưởng lợi từ tối ưu hóa tự động từ ngày đầu — không cần viết một dòng `useMemo` hay `useCallback` nào. Khi ứng dụng phát triển lên hàng chục component, lợi thế tích lũy này sẽ rõ ràng hơn nhiều.

---

### 1.5 Exercise: Thêm Dark Mode Toggle (Full Solution)

**Mục tiêu:** Triển khai tính năng chuyển đổi giao diện sáng/tối (dark mode toggle) cho CRM Dashboard, với theme được lưu trữ trong `localStorage` và được áp dụng thông qua CSS variables. Bài tập này kết hợp các kỹ thuật từ toàn bộ chương: TypeScript strict mode, Context API, `useEffect`, và path aliases.

**Yêu cầu:**
- Tạo `ThemeContext` với custom hook `useTheme` để tránh prop drilling (truyền props qua nhiều tầng)
- Type theme state với union type `'light' | 'dark'`
- Persist (lưu) lựa chọn theme vào `localStorage`
- Áp dụng theme qua CSS variables (không hardcode màu trong component)
- Wrap toàn bộ ứng dụng trong `ThemeProvider` tại `main.tsx`

**Gợi ý trước khi đọc solution:** Bắt đầu từ type — định nghĩa `Theme = 'light' | 'dark'` trước. Sau đó nghĩ về shape của context: cần expose gì ra ngoài (`theme` hiện tại và hàm `toggleTheme`)? Tạo context với giá trị `undefined` và bắt lỗi trong custom hook để đảm bảo hook chỉ được dùng bên trong Provider.

---

**Full Solution:**

```tsx [src/context/ThemeContext.tsx]
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type FC,
  type ReactNode,
} from 'react';

// Định nghĩa union type — TypeScript sẽ bắt lỗi nếu gán giá trị khác
type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

// Khởi tạo với undefined — custom hook sẽ kiểm tra và throw nếu dùng ngoài Provider
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'crm-theme-preference';

export const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Lazy initializer: chạy một lần, đọc từ localStorage ngay khi khởi tạo
    // Tránh flash of wrong theme so với useEffect approach
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;

    // Nếu chưa có preference, dùng system preference của người dùng
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    // Đồng bộ DOM và storage khi theme thay đổi
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Runtime guard — hữu ích khi làm việc trong team lớn
    throw new Error('useTheme phải được dùng bên trong <ThemeProvider>');
  }
  return context;
};
```

```tsx [src/main.tsx]
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@context/ThemeContext';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
```

```css [src/index.css]
/* CSS variables — một nguồn sự thật duy nhất cho toàn bộ theme */
:root {
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
}

.dark {
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-border: #334155;
  --color-primary: #3b82f6;
  --color-primary-hover: #60a5fa;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background-color: var(--color-background);
  color: var(--color-text-primary);
  font-family: system-ui, -apple-system, sans-serif;
  transition: background-color 0.2s ease, color 0.2s ease;
}
```

```tsx [src/App.tsx]
import type { FC } from 'react';
import { useTheme } from '@context/ThemeContext';

const App: FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--color-text-primary)' }}>
          CRM Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Quản lý quan hệ khách hàng
        </p>
      </header>

      <button
        onClick={toggleTheme}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: 'var(--color-primary)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: 'pointer',
        }}
      >
        Chuyển sang {theme === 'light' ? '🌙 Dark' : '☀️ Light'} Mode
      </button>

      <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
        Theme hiện tại: <strong>{theme}</strong>
      </p>
    </div>
  );
};

export default App;
```

Chạy `npm run dev`, nhấn nút toggle và reload trang — theme phải được ghi nhớ.

**Giải thích những quyết định quan trọng trong solution:**

Có hai điểm đáng chú ý so với cách tiếp cận phổ biến mà tôi thấy trong các tutorial thông thường. Thứ nhất, thay vì dùng `useEffect` để đọc `localStorage` sau khi render, tôi dùng *lazy initializer* — function được truyền vào `useState`. Cách này đọc giá trị từ storage *trước* lần render đầu tiên, loại bỏ hoàn toàn hiện tượng "flash" khi người dùng có dark mode preference nhưng thấy giao diện sáng trong tích tắc.

Thứ hai, `ThemeProvider` cũng kiểm tra `window.matchMedia('(prefers-color-scheme: dark)')` làm fallback — tức là ngay lần đầu vào ứng dụng, theme sẽ khớp với cài đặt hệ thống của người dùng mà không cần họ phải tự chọn. Đây là UX (trải nghiệm người dùng) được mong đợi trong các ứng dụng enterprise hiện đại.

---

> **Tiếp theo:** [Chương 2: Type-Safe Components — Xây dựng component và props an toàn kiểu dữ liệu →](./chapter-02), nơi chúng ta bắt đầu xây dựng thư viện component tái sử dụng cho CRM Dashboard — từ Button, Card cho đến các generic component có thể adapt với bất kỳ kiểu dữ liệu nào.

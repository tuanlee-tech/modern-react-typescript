# Chương 4: Custom Hooks Giúp Tiết Kiệm Hàng Trăm Dòng Code



*Chương này cover:*

- **4.1** Anatomy của một custom hook cấp production
- **4.2** `useLocalStorage` và `useDebounce` — tiện ích thiết yếu
- **4.3** `useFetch` với abort controller và kiểu generic
- **4.4** Composition hooks: kết hợp hooks thành logic phức tạp
- **4.5** Exercise: Xây dựng `useCustomers` hook cho CRM (full solution)


Chương trước bạn đã học cách quản lý state type-safe — `useState` với annotation đúng cách, `useReducer` với discriminated unions cho state machine, và derived state tính trực tiếp trong render. Những kỹ thuật đó giải quyết vấn đề *thiết kế state*, nhưng chưa giải quyết vấn đề *tái sử dụng logic*. Khi CRM Dashboard phát triển, bạn sẽ nhận thấy cùng một pattern xuất hiện lặp đi lặp lại: đọc/ghi localStorage, debounce input để tránh fetch quá nhiều, gọi API với cleanup khi component unmount. Viết lại logic đó ở mỗi component không chỉ lãng phí thời gian — nó tạo ra inconsistency và bug khi một bản sao được sửa nhưng bản sao khác thì không.

Custom hooks là cơ chế React dùng để giải quyết vấn đề này. Một custom hook là một hàm JavaScript bắt đầu bằng `use`, bên trong có thể gọi bất kỳ hook nào khác, và trả về bất kỳ giá trị nào bạn muốn. Nhưng viết một custom hook *hoạt động* và viết một custom hook *production-ready* là hai việc rất khác nhau. Chương này tập trung vào thứ hai: hooks có return type rõ ràng, xử lý cleanup đúng cách, abort fetch khi component unmount, và có thể compose với nhau thành logic phức tạp — tất cả với type safety hoàn hảo mà TypeScript cung cấp.

---

### 4.1 Anatomy Của Một Custom Hook Cấp Production

Hầu hết tutorial dạy custom hooks bằng một ví dụ `useCounter` — đơn giản, dễ hiểu, và hoàn toàn vô dụng trong thực tế. Một hook cấp production cần nhiều hơn thế: nó phải có signature (chữ ký hàm) rõ ràng, xử lý edge cases (trường hợp biên), cleanup resources khi không còn cần, và return values dễ sử dụng cho consumer.

**Quy tắc cấu trúc**

Mỗi custom hook production-ready tuân theo một cấu trúc nhất quán:

```tsx [src/hooks/useExample.ts]
import { useState, useEffect, useCallback } from 'react';

// 1. Định nghĩa return type tường minh — consumer biết chính xác nhận được gì
interface UseExampleReturn {
  data: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// 2. Định nghĩa options nếu hook cần cấu hình
interface UseExampleOptions {
  initialValue?: string;
  enabled?: boolean;
}

// 3. Hook function — tên bắt đầu bằng "use", nhận params có type
export function useExample(options: UseExampleOptions = {}): UseExampleReturn {
  const { initialValue = null, enabled = true } = options;

  // 4. Internal state
  const [data, setData] = useState<string | null>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 5. Side effects với cleanup
  useEffect(() => {
    if (!enabled) return;

    // ... logic

    return () => {
      // Cleanup — cancel requests, clear timers, unsubscribe
    };
  }, [enabled]);

  // 6. Exposed functions
  const refresh = useCallback(() => {
    // ... refresh logic
  }, []);

  // 7. Return object với type annotation đã định nghĩa ở trên
  return { data, isLoading, error, refresh };
}
```

**Tại sao định nghĩa return type tường minh?**

Nhiều developer để TypeScript suy luận return type — và trong hook đơn giản, điều đó hoạt động. Nhưng khi hook trả về object phức tạp, return type tự suy luận trở nên *quá dài* và *quá fragile* (dễ vỡ). Thêm một state variable mới vào hook có thể thay đổi inferred type theo cách bạn không lường trước, gây lỗi ở tất cả consumers. Return type tường minh hoạt động như một hợp đồng công khai: dù implementation bên trong thay đổi, consumers chỉ thấy những gì bạn chủ đích expose.

```tsx
// ❌ Inferred type — nếu thêm field mới, consumers có thể bị ảnh hưởng
export function useCustomers() {
  // ... TypeScript tự suy luận return type từ object literal
  return { customers, isLoading, error, refetch, _internalDebugState };
  // _internalDebugState vô tình bị expose ra ngoài!
}

// ✅ Explicit return type — chỉ expose những gì cần thiết
interface UseCustomersReturn {
  customers: CustomerListItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCustomers(): UseCustomersReturn {
  // ... implementation
  return { customers, isLoading, error, refetch };
}
```

**Return object vs return tuple**

React's built-in hooks dùng tuple: `const [state, setState] = useState(...)`. Custom hooks nên dùng *object* thay vì tuple trong hầu hết trường hợp:

```tsx
// ❌ Tuple — consumer phải nhớ thứ tự, destructuring positional
const [data, loading, error, refetch] = useCustomers();

// ✅ Object — tên rõ ràng, có thể chỉ lấy một phần
const { customers, isLoading } = useCustomers();
const { error, refetch } = useCustomers(); // Chỉ lấy error handling
```

Tuple phù hợp khi hook chỉ trả về 2 giá trị liên quan chặt chẽ (giống `useState` trả `[value, setter]`). Khi trả về 3+ giá trị, object rõ ràng hơn — consumer không cần nhớ "tham số thứ 4 là gì".

::: tip Convention cho custom hooks trong CRM
Trong toàn bộ dự án này, chúng ta tuân theo một convention nhất quán:
- File name: `use[Feature].ts` (ví dụ: `useCustomers.ts`, `useDebounce.ts`)
- Return type: `Use[Feature]Return` interface
- Options: `Use[Feature]Options` interface (nếu cần)
- Export: named export, không default export — để import rõ ràng hơn
:::

---

### 4.2 `useLocalStorage` và `useDebounce` — Tiện Ích Thiết Yếu

Hai hooks xuất hiện trong gần như mọi ứng dụng React nghiêm túc: lưu trữ dữ liệu vào localStorage và debounce (trì hoãn) giá trị input. Chúng ta đã thấy `localStorage` được dùng trong `ThemeContext` ở Chương 1, nhưng logic đó nằm cứng trong context. Bây giờ chúng ta trích xuất nó thành hook tái sử dụng.

**`useLocalStorage` — persistence (lưu trữ bền vững) type-safe**

```tsx [src/hooks/useLocalStorage.ts]
import { useState, useEffect, useCallback } from 'react';

interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (newValue: T | ((prev: T) => T)) => void;
  removeValue: () => void;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): UseLocalStorageReturn<T> {
  // Lazy initializer — đọc từ storage trước render đầu tiên
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      // localStorage có thể bị disabled hoặc data corrupt
      console.warn(`[useLocalStorage] Không thể đọc key "${key}"`);
      return initialValue;
    }
  });

  // Đồng bộ vào storage khi value thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`[useLocalStorage] Không thể ghi key "${key}"`);
    }
  }, [key, value]);

  // Xóa khỏi storage
  const removeValue = useCallback(() => {
    localStorage.removeItem(key);
    setValue(initialValue);
  }, [key, initialValue]);

  return { value, setValue, removeValue };
}
```

Sử dụng trong CRM — lưu trạng thái sidebar collapsed:

```tsx [src/components/layout/Sidebar.tsx]
import { type FC } from 'react';
import { useLocalStorage } from '@hooks/useLocalStorage';

const Sidebar: FC = () => {
  const { value: collapsed, setValue: setCollapsed } = useLocalStorage(
    'crm-sidebar-collapsed',
    false
  );
  // TypeScript suy luận collapsed là boolean — từ initialValue

  return (
    <aside
      style={{
        width: collapsed ? '64px' : '240px',
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        transition: 'width 0.2s ease',
        padding: '1rem',
      }}
    >
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
          fontSize: '1.25rem',
        }}
      >
        {collapsed ? '→' : '←'}
      </button>
      {!collapsed && (
        <nav style={{ marginTop: '1.5rem' }}>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Dashboard</p>
          <p style={{ color: 'var(--color-text-secondary)' }}>Khách hàng</p>
          <p style={{ color: 'var(--color-text-secondary)' }}>Cài đặt</p>
        </nav>
      )}
    </aside>
  );
};

export default Sidebar;
```

Reload trang — sidebar giữ nguyên trạng thái collapsed/expanded. Mọi component trong CRM cần persistence đều có thể dùng hook này: filter preferences, table column order, notification settings.

**`useDebounce` — trì hoãn giá trị để tránh tính toán/fetch thừa**

Khi người dùng gõ vào ô tìm kiếm, mỗi ký tự tạo ra một giá trị `search` mới. Nếu mỗi thay đổi kích hoạt một API call hoặc phép lọc tốn kém, ứng dụng sẽ chậm đi rõ rệt. Debounce giải quyết điều này bằng cách chỉ trả về giá trị mới sau khi người dùng *ngừng gõ* một khoảng thời gian nhất định.

```tsx [src/hooks/useDebounce.ts]
import { useState, useEffect } from 'react';

interface UseDebounceReturn<T> {
  debouncedValue: T;
  isPending: boolean;
}

export function useDebounce<T>(value: T, delay: number = 300): UseDebounceReturn<T> {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    // Bắt đầu pending khi value thay đổi
    setIsPending(true);

    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setIsPending(false);
    }, delay);

    // Cleanup — nếu value thay đổi trước khi delay kết thúc,
    // timer cũ bị hủy, timer mới bắt đầu
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return { debouncedValue, isPending };
}
```

`isPending` là chi tiết nhỏ nhưng quan trọng cho UX: nó cho component biết rằng giá trị đã thay đổi nhưng debounce chưa "settle" — có thể hiển thị một loading indicator nhỏ để người dùng biết hệ thống đang chờ họ gõ xong.

Tích hợp vào bộ tìm kiếm khách hàng:

```tsx [src/components/DebouncedSearch.tsx]
import { useState, type FC } from 'react';
import { useDebounce } from '@hooks/useDebounce';
import type { CustomerListItem } from '@types/customer';

interface DebouncedSearchProps {
  customers: CustomerListItem[];
  onResults: (filtered: CustomerListItem[]) => void;
}

const DebouncedSearch: FC<DebouncedSearchProps> = ({ customers, onResults }) => {
  const [search, setSearch] = useState('');
  const { debouncedValue, isPending } = useDebounce(search, 300);

  // Derived state dùng debouncedValue — chỉ filter khi ngừng gõ 300ms
  const filtered = customers.filter((c) => {
    if (debouncedValue === '') return true;
    const query = debouncedValue.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.company.toLowerCase().includes(query)
    );
  });

  // Thông báo kết quả cho parent
  // Trong production, dùng useEffect để gọi onResults khi filtered thay đổi
  // Ở đây đơn giản hóa cho ví dụ minh họa

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm kiếm khách hàng..."
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          paddingRight: '2.5rem',
          border: '1px solid var(--color-border)',
          borderRadius: '0.375rem',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
        }}
      />
      {isPending && (
        <span
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-secondary)',
            fontSize: '0.75rem',
          }}
        >
          ⏳
        </span>
      )}
    </div>
  );
};

export default DebouncedSearch;
```

::: warning Debounce vs Throttle
Debounce chờ cho đến khi người dùng *ngừng* thao tác. Throttle giới hạn tần suất thao tác (ví dụ: tối đa 1 lần mỗi 200ms). Trong CRM, debounce đúng cho search input — bạn muốn chờ người dùng gõ xong. Throttle đúng cho scroll events hoặc resize events — bạn muốn phản ứng liên tục nhưng không quá thường xuyên. Chúng ta dùng debounce ở đây vì bộ lọc khách hàng chỉ nên chạy khi người dùng đã "nói xong".
:::

---

### 4.3 `useFetch` với Abort Controller và Kiểu Generic

Fetch data từ API là thao tác phổ biến nhất trong bất kỳ ứng dụng nào — và cũng là thao tác dễ làm sai nhất. Memory leak (rò rỉ bộ nhớ) khi component unmount trước khi request hoàn thành, race conditions (điều kiện tranh chấp) khi nhiều request trả về không đúng thứ tự, và thiếu error handling là ba vấn đề kinh điển. `useFetch` giải quyết cả ba.

**AbortController — cleanup bắt buộc**

Khi component unmount (bị gỡ khỏi DOM) trong khi fetch đang chạy, response vẫn đến. Nếu response đó gọi `setState`, React warning: *"Can't perform a React state update on an unmounted component"*. `AbortController` là API trình duyệt cho phép hủy (abort) một fetch request đang chạy:

```tsx [src/hooks/useFetch.ts]
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFetchReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseFetchOptions {
  enabled?: boolean;
  headers?: Record<string, string>;
}

export function useFetch<T>(
  url: string | null,
  options: UseFetchOptions = {}
): UseFetchReturn<T> {
  const { enabled = true, headers } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref để track abort controller hiện tại
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) return;

    // Hủy request trước đó nếu đang chạy
    abortControllerRef.current?.abort();

    // Tạo controller mới cho request này
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = (await response.json()) as T;

      // Chỉ update state nếu request chưa bị abort
      if (!controller.signal.aborted) {
        setData(json);
        setIsLoading(false);
      }
    } catch (err) {
      // AbortError là expected — component unmount hoặc request mới thay thế
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Không update state — component có thể đã unmount
      }

      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định');
        setIsLoading(false);
      }
    }
  }, [url, headers]);

  useEffect(() => {
    if (!enabled || !url) return;

    fetchData();

    // Cleanup: abort request khi component unmount hoặc url thay đổi
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchData, enabled, url]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch };
}
```

**Tại sao kiểm tra `controller.signal.aborted`?**

Giữa lúc `await fetch(...)` resolve và lúc `setData(json)` chạy, component có thể đã unmount (user navigate đi trang khác). `controller.signal.aborted` kiểm tra xem request đã bị hủy chưa — nếu rồi, không gọi `setState`. Đây là cách duy nhất đúng để tránh memory leak trong async operations.

**Sử dụng trong CRM — fetch danh sách khách hàng**

```tsx [src/components/CustomerListAPI.tsx]
import { type FC } from 'react';
import { useFetch } from '@hooks/useFetch';
import type { CustomerListItem } from '@types/customer';
import Card from '@components/ui/Card';
import StatusBadge from '@components/ui/StatusBadge';
import Button from '@components/ui/Button';

const CustomerListAPI: FC = () => {
  // TypeScript biết data là CustomerListItem[] | null
  const { data: customers, isLoading, error, refetch } = useFetch<CustomerListItem[]>(
    '/api/customers'
  );

  if (isLoading) {
    return <p style={{ color: 'var(--color-text-secondary)', padding: '2rem' }}>Đang tải...</p>;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <p style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Lỗi: {error}</p>
        <Button variant="outline" size="sm" onClick={refetch}>Thử lại</Button>
      </div>
    );
  }

  if (!customers || customers.length === 0) {
    return <p style={{ color: 'var(--color-text-secondary)', padding: '2rem' }}>Không có khách hàng.</p>;
  }

  return (
    <div>
      {customers.map((customer) => (
        <Card
          key={customer.id}
          item={customer}
          renderContent={(c) => (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.name}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{c.company}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          )}
        />
      ))}
    </div>
  );
};

export default CustomerListAPI;
```

Khi user navigate ra khỏi trang khách hàng trước khi API response về, `AbortController` hủy request, không có `setState` trên component đã unmount, không có warning, không có memory leak.

::: tip useFetch vs TanStack Query
`useFetch` là hook tự viết, phù hợp cho mục đích học và hiểu cơ chế bên dưới. Trong production lớn, các thư viện như TanStack Query (React Query) cung cấp thêm: caching, stale-while-revalidate, deduplication, pagination, infinite scroll, và devtools. Nhưng hiểu `useFetch` là điều kiện tiên quyết — bạn cần biết `AbortController`, race conditions, và cleanup trước khi dùng abstraction bên thứ ba.
:::

---

### 4.4 Composition Hooks: Kết Hợp Hooks Thành Logic Phức Tạp

Sức mạnh thực sự của custom hooks không nằm ở từng hook riêng lẻ — mà nằm ở khả năng *compose* (kết hợp) chúng. Một hook có thể gọi hook khác bên trong, tạo thành chuỗi logic phức tạp mà mỗi phần vẫn đơn giản và testable (có thể kiểm thử).

**Ví dụ: `useDebouncedFetch` — kết hợp debounce + fetch**

Một kịch bản rất phổ biến trong CRM: autocomplete (tự động hoàn thành) tìm kiếm khách hàng. Người dùng gõ, debounce chờ 300ms, rồi fetch kết quả từ API:

```tsx [src/hooks/useDebouncedFetch.ts]
import { useMemo } from 'react';
import { useDebounce } from '@hooks/useDebounce';
import { useFetch } from '@hooks/useFetch';

interface UseDebouncedFetchReturn<T> {
  data: T | null;
  isLoading: boolean;
  isPending: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDebouncedFetch<T>(
  baseUrl: string,
  searchTerm: string,
  delay: number = 300
): UseDebouncedFetchReturn<T> {
  const { debouncedValue, isPending } = useDebounce(searchTerm, delay);

  // URL chỉ được tạo sau khi debounce settle
  // Nếu search rỗng, truyền null → useFetch sẽ không fetch
  const url = useMemo(() => {
    if (debouncedValue.trim() === '') return null;
    return `${baseUrl}?search=${encodeURIComponent(debouncedValue)}`;
  }, [baseUrl, debouncedValue]);

  const { data, isLoading, error, refetch } = useFetch<T>(url);

  return {
    data,
    isLoading,
    isPending, // true khi user đang gõ, debounce chưa settle
    error,
    refetch,
  };
}
```

Nhìn vào code: `useDebouncedFetch` không chứa bất kỳ logic debounce hay fetch nào — nó chỉ *kết nối* `useDebounce` và `useFetch`. Mỗi hook giữ nguyên trách nhiệm đơn lẻ. Nếu bạn cần đổi thuật toán debounce, sửa `useDebounce` — tất cả hooks dùng nó đều được cập nhật.

**Ví dụ: `usePersistentFilters` — kết hợp localStorage + reducer**

Bộ lọc khách hàng từ Chương 3 sẽ mạnh hơn nhiều nếu filter state được lưu vào localStorage — người dùng quay lại trang không phải set lại filters:

```tsx [src/hooks/usePersistentFilters.ts]
import { useReducer, useEffect } from 'react';
import { useLocalStorage } from '@hooks/useLocalStorage';
import {
  customerFilterReducer,
  initialFilterState,
} from '@/reducers/customerFilterReducer';
import type { CustomerFilterState, FilterAction } from '@types/filters';

interface UsePersistentFiltersReturn {
  state: CustomerFilterState;
  dispatch: React.Dispatch<FilterAction>;
}

export function usePersistentFilters(
  storageKey: string = 'crm-customer-filters'
): UsePersistentFiltersReturn {
  // Đọc state đã lưu từ localStorage
  const { value: savedState, setValue: saveState } =
    useLocalStorage<CustomerFilterState>(storageKey, initialFilterState);

  // Khởi tạo reducer với state từ localStorage
  const [state, dispatch] = useReducer(customerFilterReducer, savedState);

  // Đồng bộ state vào localStorage mỗi khi thay đổi
  useEffect(() => {
    saveState(state);
  }, [state, saveState]);

  return { state, dispatch };
}
```

Consumer sử dụng y hệt `useReducer` bình thường — nhưng state tự động persist:

```tsx
// Trước: state mất khi reload
const [state, dispatch] = useReducer(customerFilterReducer, initialFilterState);

// Sau: state được nhớ qua các sessions
const { state, dispatch } = usePersistentFilters();
```

Đây là bản chất của composition: bạn không viết lại logic localStorage hay reducer — bạn kết nối hai mảnh ghép đã được test riêng biệt thành một abstraction mới.

**Nguyên tắc composition cho hooks**

| Nguyên tắc | Ví dụ |
|-----------|-------|
| Mỗi hook *một* trách nhiệm | `useDebounce` chỉ debounce, `useFetch` chỉ fetch |
| Hook cấp cao compose từ hook cấp thấp | `useDebouncedFetch` = `useDebounce` + `useFetch` |
| Consumer chỉ thấy API cấp cao | Component dùng `useDebouncedFetch`, không biết bên trong có `useDebounce` |
| Không truyền hooks qua props | Hook gọi hook bên trong, không nhận hook từ bên ngoài |

::: warning Đừng tạo hook quá "thông minh"
Một hook compose 5-6 hooks khác là dấu hiệu nó đang làm quá nhiều. Nếu hook cần hơn 3 hook con, hãy tách nó thành 2 hooks trung gian. Rule of thumb: nếu bạn không thể mô tả hook trong một câu ngắn, nó quá phức tạp.
:::

---

### 4.5 Exercise: Xây Dựng `useCustomers` Hook cho CRM (Full Solution)

**Mục tiêu:** Xây dựng hook `useCustomers` hoàn chỉnh — trung tâm data layer của CRM Dashboard. Hook này combine tất cả kỹ thuật trong chương: `useLocalStorage` cho persistent filters, `useDebounce` cho search, `useFetch` cho API call, và composition để kết nối chúng. Sau exercise này, CRM Dashboard sẽ chuyển từ dữ liệu tĩnh hardcode sang hook tái sử dụng có khả năng fetch, filter, sort, và persist.

**Yêu cầu:**
- `useCustomers` hook kết hợp: fetch danh sách khách hàng, debounce search, filter theo status, sort theo cột
- Filter state persistent qua `useLocalStorage`
- Fetch có `AbortController` cleanup
- Return type tường minh (`UseCustomersReturn` interface)
- Giả lập API bằng `setTimeout` (sẽ thay bằng API thực ở các chương sau) — vì chưa có backend server
- Sử dụng `StatusBadge` và `Button` component đã xây dựng ở Chương 2
- Derived values: `filteredCustomers`, `totalPages`, `paginatedCustomers` tính trực tiếp

**Gợi ý trước khi đọc solution:** Bắt đầu từ return type — `UseCustomersReturn` cần gì? Consumer cần: danh sách đã filter+sort+paginate, loading state, error, filter actions (setSearch, setStatus, setSort, setPage, resetFilters), và thống kê (total, filtered count). Bên trong hook, compose `useLocalStorage` cho filter state, `useDebounce` cho search value, và mock `useFetch`. Pipeline tính toán giống Chương 3: filter → sort → paginate — nhưng lần này nằm bên trong hook thay vì component.

---

**Full Solution:**

```tsx [src/types/customerHook.ts]
import type { CustomerListItem } from '@types/customer';
import type { StatusFilter, SortField, SortOrder } from '@types/filters';

export interface CustomerFilters {
  search: string;
  statusFilter: StatusFilter;
  sortBy: SortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}

export interface CustomerStats {
  total: number;
  filtered: number;
  active: number;
  inactive: number;
  prospect: number;
  churned: number;
}

export interface UseCustomersReturn {
  // Data
  customers: CustomerListItem[];
  stats: CustomerStats;
  totalPages: number;

  // State
  isLoading: boolean;
  error: string | null;
  filters: CustomerFilters;

  // Actions
  setSearch: (search: string) => void;
  setStatusFilter: (status: StatusFilter) => void;
  setSort: (field: SortField) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  refetch: () => void;
}
```

```tsx [src/hooks/useCustomers.ts]
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { useDebounce } from '@hooks/useDebounce';
import type { CustomerListItem } from '@types/customer';
import type { StatusFilter, SortField } from '@types/filters';
import type { CustomerFilters, CustomerStats, UseCustomersReturn } from '@types/customerHook';

// Dữ liệu mẫu — sẽ thay bằng API call khi có backend
const MOCK_CUSTOMERS: CustomerListItem[] = [
  { id: 'cust-001', name: 'Nguyễn Thị Lan', email: 'lan@abc.com', company: 'ABC Corp', status: 'active' },
  { id: 'cust-002', name: 'Trần Văn Minh', email: 'minh@xyz.com', company: 'XYZ Ltd', status: 'prospect' },
  { id: 'cust-003', name: 'Lê Hoàng Nam', email: 'nam@def.com', company: 'DEF Inc', status: 'inactive' },
  { id: 'cust-004', name: 'Phạm Thị Hoa', email: 'hoa@ghi.com', company: 'GHI Group', status: 'active' },
  { id: 'cust-005', name: 'Võ Đức Thắng', email: 'thang@jkl.com', company: 'JKL Corp', status: 'churned' },
  { id: 'cust-006', name: 'Đặng Minh Tuấn', email: 'tuan@mno.com', company: 'MNO Inc', status: 'active' },
  { id: 'cust-007', name: 'Hoàng Thị Mai', email: 'mai@pqr.com', company: 'PQR Ltd', status: 'prospect' },
  { id: 'cust-008', name: 'Bùi Văn Đức', email: 'duc@stu.com', company: 'STU Corp', status: 'inactive' },
  { id: 'cust-009', name: 'Ngô Thị Hương', email: 'huong@vwx.com', company: 'VWX Group', status: 'active' },
  { id: 'cust-010', name: 'Lý Minh Quang', email: 'quang@yza.com', company: 'YZA Inc', status: 'churned' },
  { id: 'cust-011', name: 'Trịnh Thế Anh', email: 'anh@bcd.com', company: 'BCD Ltd', status: 'active' },
  { id: 'cust-012', name: 'Phan Thúy Hằng', email: 'hang@efg.com', company: 'EFG Corp', status: 'prospect' },
];

const DEFAULT_FILTERS: CustomerFilters = {
  search: '',
  statusFilter: 'all',
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  pageSize: 5,
};

export function useCustomers(): UseCustomersReturn {
  // ============ FETCH (giả lập API) ============
  const [allCustomers, setAllCustomers] = useState<CustomerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(() => {
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      // Giả lập: 90% success, 10% error
      if (Math.random() > 0.1) {
        setAllCustomers(MOCK_CUSTOMERS);
        setIsLoading(false);
      } else {
        setError('Không thể kết nối tới server. Vui lòng thử lại.');
        setIsLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const cleanup = fetchCustomers();
    return cleanup;
  }, [fetchCustomers]);

  // ============ PERSISTENT FILTERS ============
  const { value: filters, setValue: setFilters } = useLocalStorage<CustomerFilters>(
    'crm-customer-filters',
    DEFAULT_FILTERS
  );

  // ============ DEBOUNCED SEARCH ============
  const { debouncedValue: debouncedSearch } = useDebounce(filters.search, 300);

  // ============ FILTER ACTIONS ============
  const setSearch = useCallback(
    (search: string) => setFilters((prev) => ({ ...prev, search, page: 1 })),
    [setFilters]
  );

  const setStatusFilter = useCallback(
    (statusFilter: StatusFilter) => setFilters((prev) => ({ ...prev, statusFilter, page: 1 })),
    [setFilters]
  );

  const setSort = useCallback(
    (field: SortField) => {
      setFilters((prev) => {
        const newOrder = prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc';
        return { ...prev, sortBy: field, sortOrder: newOrder, page: 1 };
      });
    },
    [setFilters]
  );

  const setPage = useCallback(
    (page: number) => setFilters((prev) => ({ ...prev, page })),
    [setFilters]
  );

  const resetFilters = useCallback(
    () => setFilters(DEFAULT_FILTERS),
    [setFilters]
  );

  // ============ DERIVED STATE — pipeline: search → status → sort → paginate ============
  const processed = useMemo(() => {
    // Bước 1: Filter by debounced search
    let result = allCustomers;
    if (debouncedSearch.trim() !== '') {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.company.toLowerCase().includes(query)
      );
    }

    // Bước 2: Filter by status
    if (filters.statusFilter !== 'all') {
      result = result.filter((c) => c.status === filters.statusFilter);
    }

    // Bước 3: Sort
    const sorted = [...result].sort((a, b) => {
      const aVal = a[filters.sortBy];
      const bVal = b[filters.sortBy];
      const comparison = aVal.localeCompare(bVal);
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    // Bước 4: Stats (từ sorted, trước khi paginate)
    const stats: CustomerStats = {
      total: allCustomers.length,
      filtered: sorted.length,
      active: sorted.filter((c) => c.status === 'active').length,
      inactive: sorted.filter((c) => c.status === 'inactive').length,
      prospect: sorted.filter((c) => c.status === 'prospect').length,
      churned: sorted.filter((c) => c.status === 'churned').length,
    };

    // Bước 5: Paginate
    const totalPages = Math.max(1, Math.ceil(sorted.length / filters.pageSize));
    const safePage = Math.min(filters.page, totalPages);
    const startIndex = (safePage - 1) * filters.pageSize;
    const paginated = sorted.slice(startIndex, startIndex + filters.pageSize);

    return { customers: paginated, stats, totalPages };
  }, [allCustomers, debouncedSearch, filters]);

  // ============ RETURN ============
  return {
    customers: processed.customers,
    stats: processed.stats,
    totalPages: processed.totalPages,
    isLoading,
    error,
    filters,
    setSearch,
    setStatusFilter,
    setSort,
    setPage,
    resetFilters,
    refetch: fetchCustomers,
  };
}
```

```tsx [src/components/CustomerDashboard.tsx]
import { type FC } from 'react';
import { useCustomers } from '@hooks/useCustomers';
import type { SortField, StatusFilter } from '@types/filters';
import Button from '@components/ui/Button';
import StatusBadge from '@components/ui/StatusBadge';

const statusLabels = {
  all: 'Tất cả',
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  prospect: 'Tiềm năng',
  churned: 'Đã rời đi',
} satisfies Record<StatusFilter, string>;

const sortFieldLabels = {
  name: 'Tên',
  email: 'Email',
  company: 'Công ty',
  status: 'Trạng thái',
} satisfies Record<SortField, string>;

const CustomerDashboard: FC = () => {
  const {
    customers,
    stats,
    totalPages,
    isLoading,
    error,
    filters,
    setSearch,
    setStatusFilter,
    setSort,
    setPage,
    resetFilters,
    refetch,
  } = useCustomers();

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>
        <Button variant="outline" onClick={refetch}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
        Khách Hàng
      </h2>

      {/* Search + Reset */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, email hoặc công ty..."
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            border: '1px solid var(--color-border)',
            borderRadius: '0.375rem',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
          }}
        />
        <Button variant="outline" size="sm" onClick={resetFilters}>Đặt lại</Button>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(Object.keys(statusLabels) as StatusFilter[]).map((status) => (
          <Button
            key={status}
            variant={filters.statusFilter === status ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {statusLabels[status]}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
        {stats.filtered} / {stats.total} khách hàng
        · {stats.active} hoạt động · {stats.prospect} tiềm năng
      </p>

      {/* Table */}
      {isLoading ? (
        <p style={{ color: 'var(--color-text-secondary)', padding: '2rem', textAlign: 'center' }}>Đang tải...</p>
      ) : (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface)' }}>
                {(Object.keys(sortFieldLabels) as SortField[]).map((field) => (
                  <th
                    key={field}
                    onClick={() => setSort(field)}
                    style={{
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    {sortFieldLabels[field]}
                    {filters.sortBy === field && (filters.sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{c.email}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{c.company}</td>
                  <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {customers.length === 0 && (
            <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
              Không tìm thấy khách hàng phù hợp.
            </p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => setPage(filters.page - 1)}>
            ← Trước
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button key={p} variant={p === filters.page ? 'primary' : 'ghost'} size="sm" onClick={() => setPage(p)}>
              {p}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={filters.page >= totalPages} onClick={() => setPage(filters.page + 1)}>
            Tiếp →
          </Button>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
```

**Giải thích những quyết định quan trọng trong solution:**

Có ba điểm thiết kế đáng chú ý. Thứ nhất, `useCustomers` che giấu hoàn toàn implementation detail về `useLocalStorage`, `useDebounce`, và mock fetch. Component `CustomerDashboard` không biết filters được lưu vào localStorage, không biết search bị debounce 300ms, và không biết dữ liệu đến từ mock hay API thực. Khi chúng ta thay mock bằng real API ở các chương sau, *chỉ cần sửa bên trong `useCustomers`* — `CustomerDashboard` không cần chạm vào.

Thứ hai, mọi filter action (`setSearch`, `setStatusFilter`, `setSort`) đều tự động reset `page` về 1. Logic này nằm bên trong hook, không phải trong event handler của component. Đây là nguyên tắc đã thiết lập ở Chương 3 với reducer — và bây giờ chúng ta áp dụng cùng nguyên tắc cho hook: *business logic thuộc về data layer, không phải presentation layer*.

Thứ ba, toàn bộ pipeline filter → sort → paginate được wrap trong `useMemo` — bình thường React Compiler sẽ tự xử lý, nhưng trong hook (không phải component), `useMemo` tường minh giúp đảm bảo tính toán chỉ chạy lại khi dependencies thay đổi, bất kể hook được gọi trong context nào.

---

> **Tiếp theo:** [Chương 5: React 19 Actions, Optimistic Updates & Transitions →](./chapter-05), nơi chúng ta khám phá sức mạnh mới của React 19 — `useTransition` để tách urgent và non-urgent updates, `useOptimistic` để cập nhật UI trước khi server phản hồi, và xây dựng tính năng delete khách hàng với optimistic UI cho CRM Dashboard.

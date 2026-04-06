# Chương 3: Quản Lý State với Type Inference Hoàn Hảo



*Chương này cover:*

- **3.1** useState: khi nào cần annotate, khi nào để TypeScript tự suy luận
- **3.2** useReducer với discriminated unions: pattern state machine
- **3.3** Derived state và memo không dùng `useMemo` thủ công (React Compiler)
- **3.4** Lifting state đúng cách và khi nào nên dừng lại
- **3.5** Exercise: Xây dựng bộ lọc danh sách khách hàng có state type-safe (full solution)


State là bộ nhớ của một ứng dụng React — mọi thứ mà giao diện hiển thị đều là hàm của state tại thời điểm đó. Nhưng state quản lý tệ là nguồn gốc của phần lớn bug trong các ứng dụng lớn: component render khi không cần thiết, dữ liệu không đồng bộ giữa các phần của UI, và những trạng thái bất hợp lệ lẽ ra không nên tồn tại nhưng vẫn xảy ra vì không có gì ngăn cản chúng. TypeScript, khi được dùng đúng cách, biến những lỗi runtime đó thành lỗi compile — bạn không thể đặt ứng dụng vào trạng thái vô nghĩa nếu hệ thống kiểu không cho phép trạng thái đó tồn tại.

Chương này xây dựng bộ lọc danh sách khách hàng đầu tiên cho CRM Dashboard — tính năng cốt lõi mà mọi ứng dụng quản lý đều cần. Trong quá trình đó, bạn sẽ nắm vững bốn kỹ năng quản lý state quan trọng nhất: biết khi nào cần annotate và khi nào để TypeScript tự suy luận với `useState`, thiết kế state machine bất tử với `useReducer` và discriminated unions (union phân biệt), tận dụng React Compiler để loại bỏ derived state (trạng thái phái sinh) thủ công, và hiểu ranh giới giữa lifting state hữu ích và lifting state phá hoại hiệu năng.

---

### 3.1 useState: Khi Nào Cần Annotate, Khi Nào Để TypeScript Tự Suy Luận

Nhiều developer có thói quen annotate mọi `useState` call — `useState<string>('')`, `useState<number>(0)`, `useState<boolean>(false)`. Đây không phải là lỗi, nhưng nó là noise (nhiễu) không cần thiết. TypeScript có một hệ thống inference (suy luận kiểu) cực kỳ mạnh, và hiểu khi nào nên tin tưởng nó là kỹ năng quan trọng hơn nhiều so với việc annotate bừa bãi.

**Quy tắc: để TypeScript suy luận khi giá trị khởi tạo đủ thông tin**

```tsx
// ✅ TypeScript suy luận search là string — không cần annotate
const [search, setSearch] = useState('');

// ✅ Suy luận count là number
const [count, setCount] = useState(0);

// ✅ Suy luận isOpen là boolean
const [isOpen, setIsOpen] = useState(false);
```

Trong cả ba trường hợp trên, giá trị khởi tạo cho TypeScript đủ thông tin để suy luận chính xác. Thêm `<string>`, `<number>`, `<boolean>` là lặp lại những gì compiler đã biết — nó làm code dài hơn mà không an toàn hơn.

**Annotate khi giá trị khởi tạo không đại diện cho toàn bộ kiểu**

Đây là tình huống bạn *phải* annotate — và cũng là tình huống quan trọng nhất trong ứng dụng thực tế:

```tsx [src/components/CustomerDetail.tsx]
import type { Customer } from '@types/customer';

// ❌ TypeScript suy luận selectedCustomer là `null` — không bao giờ có thể là Customer
const [selectedCustomer, setSelectedCustomer] = useState(null);

// ✅ Annotate union type — null | Customer
const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
```

Nếu không annotate, TypeScript suy luận type từ giá trị `null` — và `null` chỉ có type `null`. Sau đó, khi bạn gọi `setSelectedCustomer(customer)` với một object `Customer`, TypeScript sẽ báo lỗi vì `Customer` không phải `null`. Đây là trường hợp inference không đủ thông tin.

**Annotate khi giá trị khởi tạo là subset của kiểu thực tế**

```tsx [src/components/CustomerFilters.tsx]
import type { CustomerStatus } from '@types/customer';

// ❌ TypeScript suy luận statusFilter là 'all' — literal type, không phải union
const [statusFilter, setStatusFilter] = useState('all');
// setStatusFilter('active') → lỗi: 'active' không assignable cho 'all'

// ✅ Annotate union type đầy đủ
type StatusFilter = CustomerStatus | 'all';
const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
// setStatusFilter('active') → hợp lệ ✓
```

Khi giá trị khởi tạo là một literal (`'all'`), TypeScript suy luận type là chính literal đó — không phải union rộng hơn mà bạn muốn. Đây là lý do annotate tồn tại.

**Annotate khi state là array hoặc object phức tạp bắt đầu rỗng**

```tsx [src/components/CustomerList.tsx]
import type { CustomerListItem } from '@types/customer';

// ❌ TypeScript suy luận customers là never[] — mảng rỗng mãi mãi
const [customers, setCustomers] = useState([]);

// ✅ Annotate kiểu phần tử của mảng
const [customers, setCustomers] = useState<CustomerListItem[]>([]);
```

Mảng rỗng `[]` được suy luận thành `never[]` — một mảng không thể chứa bất kỳ phần tử nào. `setCustomers([customer1])` sẽ gây lỗi compile. Annotate `<CustomerListItem[]>` cho TypeScript biết mảng sẽ chứa gì.

**Tổng hợp: quy tắc ba câu hỏi**

Trước mỗi `useState`, hỏi:

1. *Giá trị khởi tạo có type giống state cuối cùng không?* → **Không cần annotate.** (`useState('')`, `useState(0)`)
2. *State có thể là `null` hoặc `undefined` sau khi khởi tạo?* → **Annotate với union.** (`useState<T | null>(null)`)
3. *State bắt đầu rỗng nhưng sẽ chứa data phức tạp?* → **Annotate type đầy đủ.** (`useState<Customer[]>([])`)

::: tip Trong CRM Dashboard
Hầu hết state trong CRM sẽ rơi vào trường hợp 2 và 3: danh sách khách hàng bắt đầu từ mảng rỗng, khách hàng được chọn bắt đầu từ `null`, bộ lọc bắt đầu từ giá trị mặc định nhưng có thể nhận nhiều giá trị khác. Tập thói quen annotate những trường hợp này ngay — đừng để TypeScript suy luận sai rồi mới sửa.
:::

---

### 3.2 useReducer với Discriminated Unions: Pattern State Machine

`useState` hoạt động tốt khi state đơn giản — một string, một boolean, một số. Nhưng khi state có nhiều trường liên quan đến nhau, `useState` bắt đầu tạo ra trạng thái bất hợp lệ mà TypeScript không thể bắt.

**Vấn đề của nhiều useState đồng thời**

Xét một component fetch (lấy) danh sách khách hàng:

```tsx [src/components/CustomerList.tsx]
// ❌ Nhiều useState → những trạng thái bất hợp lệ có thể xảy ra
const [customers, setCustomers] = useState<Customer[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

Ba biến state riêng biệt tạo ra `2 × 2 × 2 = 8` tổ hợp trạng thái. Nhưng chỉ có 3 tổ hợp hợp lệ:

| `isLoading` | `error` | `customers` | Hợp lệ? |
|-------------|---------|-------------|----------|
| `true` | `null` | `[]` | ✅ Đang loading |
| `false` | `null` | `[...]` | ✅ Thành công |
| `false` | `"Error"` | `[]` | ✅ Lỗi |
| `true` | `"Error"` | `[...]` | ❌ Vừa loading vừa lỗi vừa có data? |
| `false` | `null` | `[]` | ⚠️ Ambiguous: chưa load hay load xong mà rỗng? |

5 tổ hợp còn lại là trạng thái bất hợp lệ mà code có thể rơi vào nếu `setIsLoading`, `setError`, `setCustomers` không được gọi đúng thứ tự. TypeScript không thể cứu bạn ở đây vì mỗi `useState` độc lập — hệ thống kiểu không biết mối quan hệ giữa chúng.

**Giải pháp: discriminated union cho state**

Discriminated union (union phân biệt) là pattern TypeScript biến nhóm trạng thái liên quan thành một kiểu duy nhất, trong đó mỗi variant (biến thể) được phân biệt bằng một trường cố định — thường gọi là discriminant. Mỗi variant chỉ chứa đúng các trường có ý nghĩa cho trạng thái đó:

```tsx [src/types/async.ts]
// Discriminated union — discriminant là trường `status`
export type AsyncState<T> =
  | { status: 'idle' }                                    // Chưa bắt đầu
  | { status: 'loading' }                                 // Đang fetch
  | { status: 'success'; data: T }                        // Thành công — data luôn có
  | { status: 'error'; error: string };                   // Lỗi — error message luôn có

// Không thể tạo trạng thái bất hợp lệ:
// { status: 'loading', data: [...] } → lỗi compile
// { status: 'error' }                → lỗi compile (thiếu error)
// { status: 'success' }              → lỗi compile (thiếu data)
```

Với `AsyncState`, mỗi trạng thái có đúng và chỉ đúng các trường nó cần. `data` chỉ tồn tại khi `status === 'success'`. `error` chỉ tồn tại khi `status === 'error'`. TypeScript enforce điều này *ở tầng kiểu* — không phải bằng convention hay discipline.

**useReducer + discriminated union actions**

`useReducer` là hook React được thiết kế cho state phức tạp. Khi kết hợp với discriminated unions cho cả state *và* actions, bạn có một state machine hoàn chỉnh mà TypeScript kiểm tra toàn bộ:

```tsx [src/hooks/useAsyncState.ts]
import { useReducer } from 'react';
import type { AsyncState } from '@types/async';

// Actions cũng dùng discriminated union
type AsyncAction<T> =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: T }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'RESET' };

function asyncReducer<T>(
  state: AsyncState<T>,
  action: AsyncAction<T>
): AsyncState<T> {
  switch (action.type) {
    case 'FETCH_START':
      return { status: 'loading' };
    case 'FETCH_SUCCESS':
      return { status: 'success', data: action.payload };
    case 'FETCH_ERROR':
      return { status: 'error', error: action.error };
    case 'RESET':
      return { status: 'idle' };
  }
}

export function useAsyncState<T>() {
  return useReducer(asyncReducer<T>, { status: 'idle' } as AsyncState<T>);
}
```

Sử dụng trong component — TypeScript narrowing (thu hẹp kiểu) hoạt động hoàn hảo trong mỗi nhánh:

```tsx [src/components/CustomerList.tsx]
import { useEffect } from 'react';
import { useAsyncState } from '@hooks/useAsyncState';
import type { CustomerListItem } from '@types/customer';
import StatusBadge from '@components/ui/StatusBadge';
import Card from '@components/ui/Card';

const CustomerList = () => {
  const [state, dispatch] = useAsyncState<CustomerListItem[]>();

  useEffect(() => {
    dispatch({ type: 'FETCH_START' });

    // Giả lập API call — sẽ thay bằng fetch thực ở Chương 4
    const timer = setTimeout(() => {
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: [
          { id: 'cust-001', name: 'Nguyễn Thị Lan', email: 'lan@abc.com', company: 'ABC Corp', status: 'active' },
          { id: 'cust-002', name: 'Trần Văn Minh', email: 'minh@xyz.com', company: 'XYZ Ltd', status: 'prospect' },
          { id: 'cust-003', name: 'Lê Hoàng Nam', email: 'nam@def.com', company: 'DEF Inc', status: 'inactive' },
        ],
      });
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Switch trên discriminant — TypeScript narrows type trong mỗi case
  switch (state.status) {
    case 'idle':
      return <p style={{ color: 'var(--color-text-secondary)' }}>Chưa tải dữ liệu.</p>;

    case 'loading':
      return <p style={{ color: 'var(--color-text-secondary)' }}>Đang tải danh sách khách hàng...</p>;

    case 'error':
      // state.error có type string — TypeScript biết chắc error tồn tại
      return (
        <div style={{ color: '#dc2626' }}>
          <p>Lỗi: {state.error}</p>
          <button onClick={() => dispatch({ type: 'RESET' })}>Thử lại</button>
        </div>
      );

    case 'success':
      // state.data có type CustomerListItem[] — TypeScript biết chắc data tồn tại
      return (
        <div>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            {state.data.length} khách hàng
          </p>
          {state.data.map((customer) => (
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
  }
};

export default CustomerList;
```

Điểm mấu chốt ở đây không chỉ là code sạch hơn — mà là TypeScript *loại bỏ hoàn toàn* khả năng truy cập sai trường. Viết `state.data` trong case `'loading'` gây lỗi compile. Viết `state.error` trong case `'success'` gây lỗi compile. Bạn không thể mắc lỗi truy cập dữ liệu chưa sẵn sàng — và đây là vấn đề mà `useState` riêng lẻ không thể giải quyết.

::: warning Exhaustiveness checking — vũ khí bí mật
Thêm `default: { const _exhaustive: never = state; return _exhaustive; }` vào cuối switch. Nếu ai đó thêm một variant mới vào `AsyncState` (ví dụ `'retrying'`) mà quên xử lý trong switch, TypeScript báo lỗi ngay — vì `never` không thể nhận giá trị nào khác.
:::

---

### 3.3 Derived State và Memo Không Dùng `useMemo` Thủ Công (React Compiler)

Derived state — trạng thái được tính toán từ state khác — là một trong những vùng dễ sai nhất khi quản lý state trong React. Sai lầm kinh điển là lưu derived state vào một `useState` riêng, rồi đồng bộ nó qua `useEffect`:

```tsx
// ❌ Anti-pattern: derived state lưu trong useState + đồng bộ bằng useEffect
const [customers, setCustomers] = useState<CustomerListItem[]>([]);
const [search, setSearch] = useState('');
const [filteredCustomers, setFilteredCustomers] = useState<CustomerListItem[]>([]);

useEffect(() => {
  setFilteredCustomers(
    customers.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    )
  );
}, [customers, search]);
```

Đây là anti-pattern vì: (1) `filteredCustomers` luôn có thể được tính từ `customers` + `search` — nó không phải state độc lập, (2) `useEffect` chạy *sau* render, nghĩa là component render hai lần cho mỗi thay đổi: một lần với dữ liệu cũ, một lần sau khi `setFilteredCustomers` được gọi. Ở quy mô enterprise, mỗi render thừa là hiệu năng lãng phí.

**Cách đúng: tính toán trực tiếp trong render**

```tsx [src/components/CustomerList.tsx]
const [customers] = useState<CustomerListItem[]>(sampleCustomers);
const [search, setSearch] = useState('');

// Derived state — tính trực tiếp, không lưu vào state
const filteredCustomers = customers.filter((c) =>
  c.name.toLowerCase().includes(search.toLowerCase())
);
```

`filteredCustomers` được tính lại mỗi lần component render. Nhưng đây là *điều đúng đắn* — nó luôn đồng bộ với `customers` và `search`, không bao giờ lệch, không cần `useEffect`.

**Nhưng nếu tính toán tốn kém thì sao?**

Trước React Compiler, câu trả lời là `useMemo`:

```tsx
// Trước React Compiler — phải memo thủ công
const filteredCustomers = useMemo(
  () => customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  ),
  [customers, search]
);
```

`useMemo` giải quyết vấn đề hiệu năng nhưng tạo ra vấn đề bảo trì: dependency array phải chính xác, nếu thiếu dependency sẽ dùng dữ liệu stale (cũ), nếu thừa dependency sẽ tính toán lại vô ích. Và quan trọng hơn, `useMemo` là một *hợp đồng ngầm* giữa bạn và React — nó giữ giá trị cached (lưu trữ) nhưng không đảm bảo luôn cache.

**React Compiler thay đổi hoàn toàn cách tiếp cận**

Với React Compiler được bật từ Chương 1, bạn không cần `useMemo` trong hầu hết trường hợp. Compiler phân tích code và tự quyết định những gì cần memoize:

```tsx [src/components/FilteredCustomerList.tsx]
import { useState, type FC } from 'react';
import type { CustomerListItem } from '@types/customer';
import Card from '@components/ui/Card';
import StatusBadge from '@components/ui/StatusBadge';

interface FilteredCustomerListProps {
  customers: CustomerListItem[];
}

const FilteredCustomerList: FC<FilteredCustomerListProps> = ({ customers }) => {
  const [search, setSearch] = useState('');

  // React Compiler tự memoize phép tính này
  // Nó sẽ chỉ chạy lại khi customers hoặc search thay đổi
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  );

  // React Compiler cũng tự memoize stats
  const stats = {
    total: filtered.length,
    active: filtered.filter((c) => c.status === 'active').length,
    inactive: filtered.filter((c) => c.status === 'inactive').length,
  };

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm theo tên, email hoặc công ty..."
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          border: '1px solid var(--color-border)',
          borderRadius: '0.375rem',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          marginBottom: '1rem',
        }}
      />

      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
        Hiển thị {stats.total} khách hàng ({stats.active} đang hoạt động, {stats.inactive} không hoạt động)
      </p>

      {filtered.map((customer) => (
        <Card
          key={customer.id}
          item={customer}
          renderContent={(c) => (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.name}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  {c.email} · {c.company}
                </p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          )}
        />
      ))}

      {filtered.length === 0 && (
        <p style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}>
          Không tìm thấy khách hàng nào phù hợp với "{search}"
        </p>
      )}
    </div>
  );
};

export default FilteredCustomerList;
```

Không có `useMemo`, không có `useCallback`, không có dependency array. React Compiler phân tích rằng `filtered` phụ thuộc vào `customers` và `search`, và tự cache kết quả. `stats` phụ thuộc vào `filtered`, và cũng được cache. Bạn viết code tự nhiên nhất có thể, compiler lo phần tối ưu.

**Khi nào vẫn cần useMemo thủ công?**

React Compiler không phải phép thuật — có vài trường hợp hiếm bạn vẫn cần memo thủ công:

1. **Referential equality cho context values** — context value là object, và nếu object được tạo mới mỗi render, tất cả consumers sẽ re-render. Compiler *có thể* xử lý được trường hợp này, nhưng nếu bạn thấy re-render không mong muốn qua Profiler, `useMemo` cho context value là rescue hợp lý.

2. **Xử lý tính toán rất nặng (hàng chục nghìn items)** — trường hợp này sẽ được đề cập kỹ hơn ở Chương 9 về Performance. Với danh sách vài trăm khách hàng, computed property bình thường là đủ nhanh.

::: tip Quy tắc ngón tay cái cho derived state
Nếu một giá trị *luôn có thể tính từ state hoặc props hiện có*, nó không nên là state riêng. Chỉ setState cho những thứ *không thể suy ra* từ dữ liệu đã có. Trong CRM: `filteredCustomers` là derived từ `customers` + `search`. `selectedCount` là derived từ `selectedIds.size`. `hasUnsavedChanges` là derived từ `formData !== initialData`.
:::

---

### 3.4 Lifting State Đúng Cách và Khi Nào Nên Dừng Lại

Lifting state (nâng state lên component cha) là kỹ thuật cơ bản nhất khi hai sibling components (component anh em) cần chia sẻ dữ liệu. Nhưng lifting quá nhiều — đưa hết state lên App level — tạo ra một vấn đề khác: component gốc trở thành god object, quản lý mọi thứ, và mỗi thay đổi state nhỏ gây re-render toàn bộ cây component.

**Khi nào lifting state là đúng**

Lifting cần thiết khi hai component cùng cấp cần phản ứng với cùng một dữ liệu. Trong CRM, thanh tìm kiếm (`SearchBar`) và danh sách (`CustomerTable`) cần chia sẻ `search` state:

```tsx [src/components/CustomerPage.tsx]
import { useState, type FC } from 'react';
import type { CustomerListItem } from '@types/customer';

// SearchBar chỉ cần search value và hàm cập nhật
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchBar: FC<SearchBarProps> = ({ value, onChange }) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Tìm kiếm khách hàng..."
      style={{
        width: '100%',
        padding: '0.5rem 0.75rem',
        border: '1px solid var(--color-border)',
        borderRadius: '0.375rem',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
      }}
    />
  );
};

// ResultCount hiển thị số kết quả
interface ResultCountProps {
  total: number;
  filtered: number;
}

const ResultCount: FC<ResultCountProps> = ({ total, filtered }) => {
  return (
    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0.5rem 0' }}>
      {filtered === total
        ? `${total} khách hàng`
        : `${filtered} / ${total} khách hàng`}
    </p>
  );
};

// CustomerTable hiển thị danh sách đã lọc
interface CustomerTableProps {
  customers: CustomerListItem[];
}

const CustomerTable: FC<CustomerTableProps> = ({ customers }) => {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
          <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Tên</th>
          <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Công ty</th>
          <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Email</th>
          <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {customers.map((c) => (
          <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
            <td style={{ padding: '0.75rem', color: 'var(--color-text-primary)' }}>{c.name}</td>
            <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)' }}>{c.company}</td>
            <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)' }}>{c.email}</td>
            <td style={{ padding: '0.75rem' }}>{c.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// CustomerPage — nơi state được lifted
const CustomerPage: FC = () => {
  const [search, setSearch] = useState('');
  const [customers] = useState<CustomerListItem[]>([
    { id: 'cust-001', name: 'Nguyễn Thị Lan', email: 'lan@abc.com', company: 'ABC Corp', status: 'active' },
    { id: 'cust-002', name: 'Trần Văn Minh', email: 'minh@xyz.com', company: 'XYZ Ltd', status: 'prospect' },
    { id: 'cust-003', name: 'Lê Hoàng Nam', email: 'nam@def.com', company: 'DEF Inc', status: 'inactive' },
    { id: 'cust-004', name: 'Phạm Thị Hoa', email: 'hoa@ghi.com', company: 'GHI Group', status: 'active' },
    { id: 'cust-005', name: 'Võ Đức Thắng', email: 'thang@jkl.com', company: 'JKL Corp', status: 'churned' },
  ]);

  // Derived state — được React Compiler tự memoize
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '1rem' }}>Khách hàng</h2>
      <SearchBar value={search} onChange={setSearch} />
      <ResultCount total={customers.length} filtered={filtered.length} />
      <CustomerTable customers={filtered} />
    </div>
  );
};

export default CustomerPage;
```

`search` state nằm ở `CustomerPage` vì cả `SearchBar` (cần ghi), `ResultCount` (cần đọc), và `CustomerTable` (cần đọc gián tiếp qua `filtered`) đều sử dụng nó. Đây là lifting state đúng chuẩn.

**Khi nào lifting state trở nên có hại**

```tsx
// ❌ Lifting quá mức — modal state không liên quan đến CustomerTable
const App = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false); // ← Chỉ Modal cần
  const [activeTab, setActiveTab] = useState(0);          // ← Chỉ Tabs cần
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // ← Chỉ Sidebar cần
  // ... 15 dòng useState khác

  // Mỗi khi toggleSidebar → toàn bộ App + children re-render
};
```

Khi `sidebarCollapsed` thay đổi, React phải re-render `App`, và do component mới render, tất cả children cũng phải đánh giá lại. Với React Compiler, các children nhận props không đổi sẽ được skip — nhưng vẫn phải chi phí đánh giá. Với ứng dụng nhỏ, điều này không đáng kể. Với CRM Dashboard lớn, nó tích lũy.

**Nguyên tắc: đưa state xuống gần nhất nơi nó được dùng**

| Quy tắc | Ví dụ trong CRM |
|---------|----------------|
| State chỉ dùng trong 1 component → giữ local | `isModalOpen` trong `AddCustomerModal` |
| State chia sẻ giữa siblings → lift lên parent trực tiếp | `search` trong `CustomerPage` |
| State chia sẻ khắp nơi → dùng Context (Ch.1) hoặc Zustand (Ch.7) | `theme`, `auth`, `notifications` |

Ở Chương 7, chúng ta sẽ giới thiệu Zustand cho global state — giải pháp khi lifting state vượt quá 2-3 tầng và Context trở nên cồng kềnh. Nhưng cho đến lúc đó, lifting state và derived state là đủ cho mọi nhu cầu của CRM.

::: warning Dấu hiệu bạn đang lifting quá mức
- Component gốc có hơn 5-6 `useState` lines
- Props được "chuyển tiếp" qua 2+ components mà không dùng (prop drilling)
- Thay đổi state ở một góc app gây re-render ở góc hoàn toàn không liên quan
- Bạn cần viết `useCallback` cho callback props chỉ để tránh re-render child

Nếu gặp những dấu hiệu này, đã đến lúc cân nhắc Context hoặc state management library.
:::

---

### 3.5 Exercise: Xây Dựng Bộ Lọc Danh Sách Khách Hàng Có State Type-Safe (Full Solution)

**Mục tiêu:** Xây dựng một bộ lọc danh sách khách hàng hoàn chỉnh cho CRM Dashboard, kết hợp: tìm kiếm theo text, lọc theo trạng thái, sắp xếp theo cột, và phân trang. Toàn bộ filter state được quản lý bằng `useReducer` với discriminated unions, đảm bảo không có trạng thái bất hợp lệ nào có thể xảy ra.

**Yêu cầu:**
- Định nghĩa `CustomerFilterState` type với các trường: `search`, `statusFilter`, `sortBy`, `sortOrder`, `page`, `pageSize`
- Định nghĩa `FilterAction` discriminated union cho tất cả actions: SET_SEARCH, SET_STATUS_FILTER, SET_SORT, SET_PAGE, RESET_FILTERS
- `SET_SEARCH` và `SET_STATUS_FILTER` phải tự động reset `page` về 1
- Derived state: `filteredCustomers`, `paginatedCustomers`, `totalPages` tính trực tiếp từ state — không dùng `useState` hay `useMemo`
- Sử dụng `Button` component từ Chương 2 cho filter controls
- Sử dụng `StatusBadge` component từ Chương 2 cho badge hiển thị trạng thái

**Gợi ý trước khi đọc solution:** Bắt đầu từ types — định nghĩa `SortField` union (cột nào cho phép sort), `SortOrder` union (`'asc' | 'desc'`), `StatusFilter` union (bao gồm `'all'`). Sau đó xây `CustomerFilterState` interface và `FilterAction` union. Reducer xử lý mỗi action với logic reset page khi filter thay đổi. Cuối cùng, trong component, chain các phép tính: filter by search → filter by status → sort → paginate.

---

**Full Solution:**

```tsx [src/types/filters.ts]
import type { CustomerStatus } from '@types/customer';

// Các cột cho phép sắp xếp
export type SortField = 'name' | 'email' | 'company' | 'status';
export type SortOrder = 'asc' | 'desc';

// Filter status bao gồm 'all' để hiển thị tất cả
export type StatusFilter = CustomerStatus | 'all';

// State đầy đủ của bộ lọc — một type duy nhất, không phải 6 useState
export interface CustomerFilterState {
  search: string;
  statusFilter: StatusFilter;
  sortBy: SortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}

// Discriminated union cho actions — mỗi action có đúng payload cần thiết
export type FilterAction =
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: StatusFilter }
  | { type: 'SET_SORT'; payload: { field: SortField; order: SortOrder } }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'RESET_FILTERS' };
```

```tsx [src/reducers/customerFilterReducer.ts]
import type { CustomerFilterState, FilterAction } from '@types/filters';

export const initialFilterState: CustomerFilterState = {
  search: '',
  statusFilter: 'all',
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  pageSize: 5,
};

export function customerFilterReducer(
  state: CustomerFilterState,
  action: FilterAction
): CustomerFilterState {
  switch (action.type) {
    case 'SET_SEARCH':
      // Reset page khi search thay đổi — kết quả mới, quay về trang 1
      return { ...state, search: action.payload, page: 1 };

    case 'SET_STATUS_FILTER':
      // Reset page khi filter thay đổi
      return { ...state, statusFilter: action.payload, page: 1 };

    case 'SET_SORT':
      return {
        ...state,
        sortBy: action.payload.field,
        sortOrder: action.payload.order,
        page: 1,
      };

    case 'SET_PAGE':
      return { ...state, page: action.payload };

    case 'RESET_FILTERS':
      return initialFilterState;

    // Exhaustiveness check — nếu thêm action mới mà quên xử lý, compile error
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
```

```tsx [src/components/CustomerFilterPanel.tsx]
import { useReducer, type FC } from 'react';
import type { CustomerListItem } from '@types/customer';
import type { SortField, StatusFilter } from '@types/filters';
import { customerFilterReducer, initialFilterState } from '@/reducers/customerFilterReducer';
import Button from '@components/ui/Button';
import StatusBadge from '@components/ui/StatusBadge';

// Dữ liệu mẫu — sẽ thay bằng API call ở Chương 4
const sampleCustomers: CustomerListItem[] = [
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

// Status filter options — type-safe với satisfies
const statusOptions = {
  all: 'Tất cả',
  active: 'Đang hoạt động',
  inactive: 'Không hoạt động',
  prospect: 'Tiềm năng',
  churned: 'Đã rời đi',
} satisfies Record<StatusFilter, string>;

// Sort options
const sortFieldLabels = {
  name: 'Tên',
  email: 'Email',
  company: 'Công ty',
  status: 'Trạng thái',
} satisfies Record<SortField, string>;

const CustomerFilterPanel: FC = () => {
  const [state, dispatch] = useReducer(customerFilterReducer, initialFilterState);

  // ========== DERIVED STATE — tính trực tiếp, React Compiler tự memoize ==========

  // Bước 1: Filter by search
  const searchFiltered = sampleCustomers.filter((c) => {
    if (state.search === '') return true;
    const query = state.search.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.company.toLowerCase().includes(query)
    );
  });

  // Bước 2: Filter by status
  const statusFiltered = state.statusFilter === 'all'
    ? searchFiltered
    : searchFiltered.filter((c) => c.status === state.statusFilter);

  // Bước 3: Sort
  const sorted = [...statusFiltered].sort((a, b) => {
    const aVal = a[state.sortBy];
    const bVal = b[state.sortBy];
    const comparison = aVal.localeCompare(bVal);
    return state.sortOrder === 'asc' ? comparison : -comparison;
  });

  // Bước 4: Paginate
  const totalPages = Math.ceil(sorted.length / state.pageSize);
  const startIndex = (state.page - 1) * state.pageSize;
  const paginatedCustomers = sorted.slice(startIndex, startIndex + state.pageSize);

  // Bước 5: Stats
  const stats = {
    total: sampleCustomers.length,
    filtered: sorted.length,
    showing: paginatedCustomers.length,
    activeCount: sorted.filter((c) => c.status === 'active').length,
  };

  // ========== HANDLERS — dispatch actions, không setState trực tiếp ==========

  const handleSort = (field: SortField) => {
    const newOrder = state.sortBy === field && state.sortOrder === 'asc' ? 'desc' : 'asc';
    dispatch({ type: 'SET_SORT', payload: { field, order: newOrder } });
  };

  const getSortIndicator = (field: SortField): string => {
    if (state.sortBy !== field) return '';
    return state.sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  // ========== RENDER ==========

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
        Quản Lý Khách Hàng
      </h2>

      {/* Search + Reset */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={state.search}
          onChange={(e) => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
          placeholder="Tìm theo tên, email hoặc công ty..."
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            border: '1px solid var(--color-border)',
            borderRadius: '0.375rem',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            fontSize: '0.875rem',
          }}
        />
        <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'RESET_FILTERS' })}>
          Đặt lại bộ lọc
        </Button>
      </div>

      {/* Status filter buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(Object.keys(statusOptions) as StatusFilter[]).map((statusKey) => (
          <Button
            key={statusKey}
            variant={state.statusFilter === statusKey ? 'primary' : 'outline'}
            size="sm"
            onClick={() => dispatch({ type: 'SET_STATUS_FILTER', payload: statusKey })}
          >
            {statusOptions[statusKey]}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
        Hiển thị {stats.showing} / {stats.filtered} khách hàng
        {stats.filtered !== stats.total && ` (lọc từ ${stats.total})`}
        {stats.activeCount > 0 && ` · ${stats.activeCount} đang hoạt động`}
      </p>

      {/* Table */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface)' }}>
              {(Object.keys(sortFieldLabels) as SortField[]).map((field) => (
                <th
                  key={field}
                  onClick={() => handleSort(field)}
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
                  {sortFieldLabels[field]}{getSortIndicator(field)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedCustomers.map((customer) => (
              <tr
                key={customer.id}
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                  {customer.name}
                </td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                  {customer.email}
                </td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                  {customer.company}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <StatusBadge status={customer.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedCustomers.length === 0 && (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
            Không tìm thấy khách hàng nào phù hợp.
          </p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <Button
            variant="outline"
            size="sm"
            disabled={state.page <= 1}
            onClick={() => dispatch({ type: 'SET_PAGE', payload: state.page - 1 })}
          >
            ← Trước
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Button
              key={pageNum}
              variant={pageNum === state.page ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => dispatch({ type: 'SET_PAGE', payload: pageNum })}
            >
              {pageNum}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            disabled={state.page >= totalPages}
            onClick={() => dispatch({ type: 'SET_PAGE', payload: state.page + 1 })}
          >
            Tiếp →
          </Button>
        </div>
      )}
    </div>
  );
};

export default CustomerFilterPanel;
```

**Giải thích những quyết định quan trọng trong solution:**

Có ba điểm thiết kế đáng chú ý. Thứ nhất, `SET_SEARCH` và `SET_STATUS_FILTER` tự động reset `page` về 1 trong reducer — không phải trong component. Đây là nguyên tắc quan trọng: *business logic thuộc về reducer, không phải event handler*. Nếu logic nằm trong component, mỗi nơi dispatch `SET_SEARCH` phải nhớ cũng dispatch `SET_PAGE` — và chỉ cần một nơi quên là có bug. Khi logic nằm trong reducer, nó xảy ra *luôn luôn*, không có ngoại lệ.

Thứ hai, toàn bộ pipeline tính toán — search → status filter → sort → paginate — là derived state, tính trực tiếp trong hàm render mà không có `useState` hay `useMemo` nào. React Compiler tự động nhận biết rằng `searchFiltered` phụ thuộc vào `sampleCustomers` và `state.search`, và chỉ tính lại khi một trong hai thay đổi. Tương tự cho `statusFiltered`, `sorted`, và `paginatedCustomers`. Bạn viết code tự nhiên nhất có thể, compiler lo tối ưu.

Thứ ba, exhaustiveness check ở `default` case trong reducer không chỉ là phòng ngừa — nó là bảo hiểm cho team. Sau này, khi một thành viên khác thêm action `SET_PAGE_SIZE` vào `FilterAction` union mà quên thêm case vào reducer, TypeScript báo lỗi tại dòng `const _exhaustive: never = action` — vì `{ type: 'SET_PAGE_SIZE'; ... }` không thể gán cho `never`. Đây là cách TypeScript biến convention thành enforcement.

---

> **Tiếp theo:** [Chương 4: Custom hooks giúp tiết kiệm hàng trăm dòng code →](../part2/chapter-04), nơi chúng ta trích xuất logic lặp lại thành các hook tái sử dụng — `useLocalStorage`, `useDebounce`, `useFetch` — và xây dựng `useCustomers` hook để CRM Dashboard chuyển từ dữ liệu tĩnh sang fetch API thực sự.

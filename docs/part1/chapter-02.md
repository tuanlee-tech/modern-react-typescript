# Chương 2: Xây Dựng Component và Props An Toàn Kiểu Dữ Liệu



*Chương này cover:*

- **2.1** Interface vs type cho props (khi nào dùng cái nào)
- **2.2** Generic components có thể mở rộng
- **2.3** Children và ReactNode: kiểu đúng trong mọi trường hợp
- **2.4** Từ khóa `satisfies`: bảo toàn literal types
- **2.5** Exercise: Xây dựng Card và Button component tái sử dụng (full solution)


Component (thành phần giao diện) là đơn vị ngôn ngữ của React — mọi thứ bạn xây dựng đều là sự kết hợp và sắp xếp của chúng. Nhưng component mạnh hay yếu phần lớn phụ thuộc vào cách bạn định nghĩa hợp đồng giữa chúng với nhau: props (thuộc tính truyền vào). Props được định nghĩa lỏng lẻo dẫn đến lỗi runtime khó truy vết, component khó tái sử dụng, và codebase không thể refactor (tái cấu trúc) an toàn. Props được định nghĩa chặt chẽ với TypeScript biến trình biên dịch thành người review code không bao giờ mệt mỏi.

Chương này xây dựng thư viện component nền tảng cho CRM Dashboard: một `Button` production-ready với đầy đủ variants và states, một `Card` generic có thể hiển thị bất kỳ kiểu dữ liệu nào, và các layout component tái sử dụng. Trong quá trình đó, bạn sẽ nắm vững bốn kỹ thuật TypeScript quan trọng nhất khi làm việc với React: phân biệt `interface` và `type`, viết generic component (component tổng quát), type hóa `children` đúng cách, và dùng toán tử `satisfies` để bảo toàn literal types.

---

### 2.1 Interface vs Type cho Props — Khi Nào Dùng Cái Nào

Đây là một trong những câu hỏi gây tranh luận nhất trong cộng đồng TypeScript + React, và câu trả lời trung thực là: cả hai đều hoạt động được trong hầu hết trường hợp. Tuy nhiên, "hoạt động được" không phải là tiêu chí duy nhất. Câu hỏi thực sự là: *cái nào thể hiện ý định của bạn rõ ràng hơn?*

**Interface — khi props cần được mở rộng**

Interface tỏa sáng trong các tình huống cần extensibility (khả năng mở rộng). Cú pháp `extends` rõ ràng, và TypeScript hỗ trợ *declaration merging* (hợp nhất khai báo) — tức là hai interface trùng tên tự động được gộp lại. Đây là nền tảng của nhiều thư viện component public.

Bắt đầu với một Button đơn giản không có types để thấy vấn đề rõ hơn:

```tsx [src/components/ui/Button.tsx]
// ❌ Không có types — TypeScript không bắt được gì
const Button = ({ text, onClick }) => {
  return <button onClick={onClick}>{text}</button>;
};
```

Truyền `text={42}` sẽ không gây lỗi compile — chỉ vỡ lúc render. Thêm interface:

```tsx [src/components/ui/Button.tsx]
import { FC } from 'react';

interface ButtonProps {
  text: string;
  onClick: () => void;
}

const Button: FC<ButtonProps> = ({ text, onClick }) => {
  return <button onClick={onClick}>{text}</button>;
};

export default Button;
```

Ngay lập tức, `<Button text={42} onClick={() => {}} />` trở thành lỗi compile. Interface phát huy sức mạnh khi bạn cần extend (mở rộng) cho các biến thể:

```tsx [src/components/ui/Button.tsx]
import { FC } from 'react';

interface ButtonProps {
  text: string;
  onClick: () => void;
}

// Kế thừa toàn bộ ButtonProps, thêm variant
interface StyledButtonProps extends ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
}

const StyledButton: FC<StyledButtonProps> = ({ text, onClick, variant }) => {
  const colorMap = {
    primary: '#2563eb',
    secondary: '#6b7280',
    danger: '#dc2626',
  };

  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: colorMap[variant], color: '#fff' }}
    >
      {text}
    </button>
  );
};
```

Đây là lý do interface phổ biến trong các component library (thư viện component): người dùng bên ngoài có thể extend props của bạn mà không cần sửa source.

**Type — khi props cần composability phức tạp**

Type alias không hỗ trợ declaration merging, nhưng bù lại cung cấp những khả năng mà interface không có: union types, intersection types, mapped types, và conditional types.

```tsx
// Union type — interface không thể làm điều này một cách tự nhiên
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

// Intersection — kết hợp hai shapes
type BaseProps = { id: string; className?: string };
type ButtonProps = BaseProps & {
  text: string;
  variant: ButtonVariant;
};

// Mapped type — tự động generate props từ union
type VariantStyleMap = {
  [K in ButtonVariant]: string;
};
```

**Quy tắc thực tế cho dự án này**

Thay vì tranh luận lý thuyết, hãy theo một quy tắc đơn giản và nhất quán:

- Dùng **interface** cho props của component — dễ extend, dễ đọc, convention phổ biến
- Dùng **type** cho union types, derived types, utility types, và function signatures

```tsx
// ✅ Interface cho component props
interface CustomerCardProps {
  customer: Customer;        // type Customer được import
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
}

// ✅ Type cho unions và computed types
type CustomerStatus = 'active' | 'inactive' | 'prospect' | 'churned';
type CustomerAction = 'edit' | 'delete' | 'archive';
type PartialCustomer = Partial<Customer>;
```

::: tip Declaration merging — khi nào thực sự cần thiết?
Declaration merging hữu ích khi bạn viết thư viện mà người khác sẽ augment (bổ sung). Trong một ứng dụng internal như CRM Dashboard, bạn gần như không bao giờ cần nó. Đừng chọn interface chỉ vì *có thể* cần merge — chọn vì nó diễn đạt đúng ý định hơn.
:::

---

### 2.2 Generic Components Có Thể Mở Rộng

Vấn đề kinh điển của một codebase phát triển nhanh: bạn viết `CustomerCard`, rồi `OrderCard`, rồi `ProductCard`, và sau ba tuần bạn đang bảo trì ba component gần như giống hệt nhau. Generic components (component tổng quát) giải quyết điều này bằng cách tách biệt *cách render* khỏi *kiểu dữ liệu được render*.

**Generic Card cơ bản**

Tạo component `Card` có thể hiển thị bất kỳ kiểu dữ liệu nào mà không mất type safety:

```tsx [src/components/ui/Card.tsx]
import { FC, ReactNode } from 'react';

// T là type parameter — sẽ được TypeScript suy luận khi dùng component
interface CardProps<T> {
  item: T;
  renderContent: (item: T) => ReactNode;
  className?: string;
}

// Cú pháp <T,> — dấu phẩy ngăn TypeScript nhầm với JSX tag
const Card = <T,>({ item, renderContent, className = '' }: CardProps<T>) => {
  return (
    <div className={`border rounded-lg p-4 shadow-sm bg-white ${className}`}>
      {renderContent(item)}
    </div>
  );
};

export default Card;
```

Dùng với `Customer` type từ Chương 1:

```tsx [src/App.tsx]
import Card from '@components/ui/Card';
import type { Customer } from '@types/customer';

const customer: Customer = {
  id: 'cust-001',
  name: 'Nguyễn Thị Lan',
  email: 'lan@example.com',
  company: 'Công ty TNHH ABC',
  status: 'active',
  createdAt: '2026-01-15T09:00:00Z',
};

// TypeScript suy luận T = Customer từ prop `item`
// Bên trong renderContent, `cust` có đầy đủ type Customer
<Card
  item={customer}
  renderContent={(cust) => (
    <div>
      <h3 className="font-bold text-gray-900">{cust.name}</h3>
      <p className="text-sm text-gray-600">{cust.email}</p>
      <p className="text-xs text-gray-400">{cust.company}</p>
      {/* cust.phone → TypeScript biết đây là string | undefined */}
    </div>
  )}
/>
```

Điểm mấu chốt: bên trong `renderContent`, editor biết chính xác các property của `cust`. Nếu bạn gõ `cust.address` (không tồn tại trong `Customer`), TypeScript báo lỗi ngay lập tức — không cần chạy ứng dụng.

**Generic List — component mạnh nhất trong CRM**

`List` là generic component quan trọng nhất bạn sẽ viết. Nó render bất kỳ mảng dữ liệu nào với một hàm render tùy chỉnh:

```tsx [src/components/ui/List.tsx]
import { ReactNode } from 'react';

interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  className?: string;
}

const List = <T,>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage = 'Không có dữ liệu',
  className = '',
}: ListProps<T>) => {
  if (items.length === 0) {
    return (
      <p className="text-gray-500 text-center py-12">{emptyMessage}</p>
    );
  }

  return (
    <ul className={`space-y-3 ${className}`}>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
};

export default List;
```

Dùng `List` với `Card` để render danh sách khách hàng — lần đầu tiên CRM Dashboard có nội dung thực sự:

```tsx [src/App.tsx]
import List from '@components/ui/List';
import Card from '@components/ui/Card';
import type { CustomerListItem } from '@types/customer';

const customers: CustomerListItem[] = [
  { id: 'cust-001', name: 'Nguyễn Thị Lan', email: 'lan@abc.com', company: 'Công ty ABC', status: 'active' },
  { id: 'cust-002', name: 'Trần Văn Minh', email: 'minh@xyz.com', company: 'XYZ Corp', status: 'prospect' },
  { id: 'cust-003', name: 'Lê Hoàng Nam', email: 'nam@def.com', company: 'DEF Ltd', status: 'inactive' },
];

<List
  items={customers}
  keyExtractor={(c) => c.id}
  emptyMessage="Chưa có khách hàng nào"
  renderItem={(c) => (
    <Card
      item={c}
      renderContent={(customer) => (
        <div className="flex justify-between items-center">
          <div>
            <p className="font-semibold text-gray-900">{customer.name}</p>
            <p className="text-sm text-gray-500">{customer.company}</p>
          </div>
          <span className="text-sm text-gray-400">{customer.email}</span>
        </div>
      )}
    />
  )}
/>
```

`List` không biết gì về `Customer` — nó chỉ biết rằng nó nhận một mảng kiểu `T` và hàm render cho `T`. Điều này có nghĩa là cùng một component có thể dùng cho danh sách đơn hàng, sản phẩm, hoặc bất kỳ entity nào khác trong tương lai.

::: tip Khi nào nên dùng generic vs khi nào nên tạo component riêng?
Generic phù hợp khi **cấu trúc render giống nhau, chỉ kiểu dữ liệu khác nhau**. Nếu hai component có cùng kiểu dữ liệu nhưng render khác nhau hoàn toàn, hãy tạo hai component riêng — đừng cố ép chúng vào một generic với quá nhiều props conditional.
:::

---

### 2.3 Children và ReactNode — Kiểu Đúng Trong Mọi Trường Hợp

`children` là prop đặc biệt nhất trong React — mọi thứ nằm giữa thẻ mở và thẻ đóng của một component đều được truyền vào đây. Nhưng type hóa `children` đúng cách lại hay bị làm sai, dẫn đến các component quá strict (từ chối `string`, `null`, hay `array` hợp lệ) hoặc quá lỏng (nhận `any` và mất hết type safety).

**Hiểu ReactNode trước khi dùng**

`ReactNode` là union type rộng nhất mà React có thể render:

```ts
// Định nghĩa của ReactNode trong React type declarations
type ReactNode =
  | ReactElement          // <Component />
  | string                // "Hello"
  | number                // 42
  | boolean               // true (nhưng không render gì)
  | null                  // null (không render gì)
  | undefined             // undefined (không render gì)
  | ReactFragment         // <> ... </>
  | ReactPortal           // ReactDOM.createPortal(...)
  | Iterable<ReactNode>;  // Array của các ReactNode trên
```

Đây là type bạn nên dùng cho `children` trong hầu hết mọi trường hợp — vì nó phản ánh đúng những gì thực sự có thể xuất hiện giữa hai thẻ JSX.

**Layout container cơ bản**

```tsx [src/components/layout/PageLayout.tsx]
import { type FC, type ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode; // Slot cho buttons, dropdowns ở header
}

const PageLayout: FC<PageLayoutProps> = ({
  children,
  title,
  description,
  actions,
}) => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {(title || actions) && (
        <header
          className="border-b px-6 py-4 flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            {title && (
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {title}
              </h1>
            )}
            {description && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </header>
      )}
      <main className="px-6 py-6">{children}</main>
    </div>
  );
};

export default PageLayout;
```

`actions` được type là `ReactNode` — nghĩa là bạn có thể truyền vào một button, một group buttons, hoặc `null` (không hiển thị gì). Đây là pattern *slot* (khe cắm) phổ biến trong enterprise UI.

**Render Props — children là function**

Đây là pattern mạnh nhất và hay bị hiểu nhầm nhất. Thay vì `children` là nội dung tĩnh, `children` là một function nhận data từ component và trả về JSX. Pattern này cho phép tái sử dụng *logic* mà không ràng buộc *giao diện*:

```tsx [src/components/ui/Disclosure.tsx]
import { type FC, type ReactNode, useState } from 'react';

interface DisclosureProps {
  // children là function — nhận state, trả về ReactNode
  children: (args: { isOpen: boolean; toggle: () => void }) => ReactNode;
  defaultOpen?: boolean;
}

// Disclosure quản lý logic mở/đóng, không quan tâm UI trông như thế nào
const Disclosure: FC<DisclosureProps> = ({ children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggle = () => setIsOpen((prev) => !prev);

  // Trả về những gì consumer quyết định render
  return <>{children({ isOpen, toggle })}</>;
};

export default Disclosure;
```

Dùng `Disclosure` trong CRM để tạo expandable customer notes:

```tsx [src/App.tsx]
import Disclosure from '@components/ui/Disclosure';

<Disclosure defaultOpen={false}>
  {({ isOpen, toggle }) => (
    <div
      className="border rounded-lg overflow-hidden"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <button
        onClick={toggle}
        className="w-full px-4 py-3 text-left flex justify-between items-center"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <span className="font-medium">Ghi chú khách hàng</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="px-4 py-3" style={{ backgroundColor: 'var(--color-background)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Khách hàng VIP từ Q1/2025. Ưu tiên liên hệ qua email.
            Đã mua gói Enterprise, gia hạn vào tháng 3/2027.
          </p>
        </div>
      )}
    </div>
  )}
</Disclosure>
```

`Disclosure` không biết gì về nội dung bên trong — nó chỉ cung cấp `isOpen` và `toggle`. Consumer toàn quyền quyết định UI. Đây là *headless component pattern* — pattern nền tảng của các thư viện như Radix UI và Headless UI.

**Tránh các sai lầm phổ biến về children types**

```tsx
// ❌ ReactElement — quá strict, từ chối string và null
interface WrongProps {
  children: React.ReactElement;
}

// ❌ JSX.Element — tương đương ReactElement, cùng vấn đề
interface WrongProps2 {
  children: JSX.Element;
}

// ✅ ReactNode — đúng cho wrapper/container components
interface CorrectProps {
  children: ReactNode;
}

// ✅ Khi muốn enforce exactly one child
interface OneChildProps {
  children: ReactElement; // Intentionally strict — documented trade-off
}
```

::: warning Khi nào dùng ReactElement thay vì ReactNode?
Chỉ khi bạn cần clone, inspect, hoặc manipulate child element trực tiếp qua `React.cloneElement()` hay `React.Children` utilities. Trong tất cả các trường hợp còn lại, `ReactNode` là lựa chọn đúng.
:::

---

### 2.4 Toán Tử `satisfies` — Bảo Toàn Literal Types

Đây là một trong những tính năng TypeScript bị đánh giá thấp nhất, nhưng lại giải quyết một vấn đề xuất hiện rất thường xuyên trong code React thực tế.

**Vấn đề: type annotation làm mất precision**

Khi bạn annotate (gán kiểu) một object literal, TypeScript *widening* (mở rộng) các giá trị về kiểu tổng quát hơn:

```ts
// Annotate bằng type — giá trị bị widen thành string
const statusColors: Record<string, string> = {
  active: 'green',
  inactive: 'gray',
  prospect: 'blue',
};

// TypeScript biết statusColors.active là `string`
// Nhưng bạn không thể dùng nó cho exhaustiveness checking
const color = statusColors['active']; // type: string — mất literal 'green'
```

Nếu không annotate, TypeScript giữ literal types nhưng không validate shape:

```ts
// Không annotate — literals được giữ, nhưng không có validation
const statusColors = {
  active: 'green',
  inactive: 'gray',
  typo_key: 'red', // ❌ Lỗi không bị bắt — key sai nhưng TypeScript không biết
};
```

**`satisfies` — tốt nhất của cả hai thế giới**

```ts [src/constants/statuses.ts]
import type { CustomerStatus } from '@types/customer';

// Định nghĩa shape mong muốn
type StatusColorMap = Record<CustomerStatus, string>;

// satisfies: validate shape NHƯNG giữ literal types
export const statusColors = {
  active: 'green',
  inactive: 'gray',
  prospect: 'blue',
  churned: 'red',
} satisfies StatusColorMap;

// ✅ Validation: thêm key sai sẽ báo lỗi ngay
// ✅ Precision: statusColors.active có type 'green', không phải string
```

Trong component, điều này cho phép narrowing chính xác hơn:

```tsx [src/components/ui/StatusBadge.tsx]
import { type FC } from 'react';
import { statusColors } from '@constants/statuses';
import type { CustomerStatus } from '@types/customer';

// Badge color map với satisfies
type BadgeConfig = { bg: string; text: string; label: string };

const badgeConfig = {
  active: { bg: '#dcfce7', text: '#166534', label: 'Đang hoạt động' },
  inactive: { bg: '#f3f4f6', text: '#374151', label: 'Không hoạt động' },
  prospect: { bg: '#dbeafe', text: '#1e40af', label: 'Tiềm năng' },
  churned: { bg: '#fee2e2', text: '#991b1b', label: 'Đã rời đi' },
} satisfies Record<CustomerStatus, BadgeConfig>;

interface StatusBadgeProps {
  status: CustomerStatus;
}

const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  const { bg, text, label } = badgeConfig[status];
  // TypeScript biết bg, text, label là string — đủ để dùng
  // Nếu thêm 'review' vào CustomerStatus union mà quên thêm vào badgeConfig,
  // TypeScript báo lỗi ngay tại dòng satisfies

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
```

**So sánh với các alternatives**

```ts
type Target = Record<CustomerStatus, string>;

// ❌ Type annotation — widen, mất literal types
const a: Target = { active: 'green', ... };
// a.active → type: string

// ❌ Type assertion (as) — bypass validation hoàn toàn
const b = { active: 'green', ... } as Target;
// Không bắt được missing keys hay typos

// ❌ as const — giữ literals nhưng không validate against shape
const c = { active: 'green', typo: 'red' } as const;
// TypeScript không biết 'typo' là sai

// ✅ satisfies — validate + giữ literals
const d = { active: 'green', ... } satisfies Target;
// d.active → type: 'green' (literal)
// Missing key hoặc typo → lỗi compile
```

::: tip Khi nào dùng `satisfies`?
Luôn dùng `satisfies` khi bạn định nghĩa:
- Variant/style maps (button variants, badge configs)
- Route configuration objects
- Feature flag objects
- Bất kỳ object nào mà key phải là một union type cụ thể

Quy tắc ngắn gọn: nếu bạn đang dùng `as` để "tắt" TypeScript, hãy thử `satisfies` trước.
:::

---

### 2.5 Exercise: Xây Dựng Card và Button Component Tái Sử Dụng (Full Solution)

**Mục tiêu:** Kết hợp toàn bộ kỹ thuật trong chương — typed props với interface, generic component, `ReactNode`, và `satisfies` — để xây dựng hai component production-ready sẽ được dùng xuyên suốt CRM Dashboard: `Button` với đầy đủ variants và loading state, và `Card` với nhiều chế độ hiển thị.

**Yêu cầu:**
- `Button`: hỗ trợ 5 variants, 3 sizes, trạng thái loading, icon trái/phải, full-width mode, và kế thừa toàn bộ HTML button attributes
- `Card`: hỗ trợ cả hai chế độ — simple children wrapper và generic item + render props — với optional header và footer
- Tất cả variant styles phải dùng `satisfies` để bảo toàn literal types
- Phải accessibility-friendly (có `aria-` attributes phù hợp)

**Gợi ý trước khi đọc solution:** Với `Button`, bắt đầu từ type definitions — `ButtonVariant` và `ButtonSize` union trước, rồi `ButtonProps interface` kế thừa từ `ButtonHTMLAttributes<HTMLButtonElement>`. Dùng `Omit` để loại bỏ `disabled` khỏi spread vì bạn cần override nó với logic `isLoading`. Với `Card`, hãy nghĩ về union type: `CardWithChildren | CardWithItem<T>` — hai chế độ hoàn toàn khác nhau nhưng chung một component.

---

**Full Solution — Button Component:**

```tsx [src/components/ui/Button.tsx]
import { type FC, type ButtonHTMLAttributes, type ReactNode } from 'react';

// Union types cho variants và sizes
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

// Kế thừa tất cả HTML button attributes, override 'disabled' để kiểm soát logic
interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

// satisfies: validate Record shape + giữ literal string types cho Tailwind
const variantStyles = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 disabled:bg-gray-50',
  outline:   'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
  ghost:     'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500',
} satisfies Record<ButtonVariant, string>;

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
} satisfies Record<ButtonSize, string>;

const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  children,
  ...rest
}) => {
  const isDisabled = disabled || isLoading;

  const baseStyles = [
    'inline-flex items-center justify-center font-medium rounded-md',
    'transition-colors duration-150',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
  ].join(' ');

  return (
    <button
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={isLoading}
      className={[
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {/* Icon trái */}
      {!isLoading && leftIcon && (
        <span aria-hidden="true">{leftIcon}</span>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}

      {/* Label */}
      <span>{children}</span>

      {/* Icon phải */}
      {!isLoading && rightIcon && (
        <span aria-hidden="true">{rightIcon}</span>
      )}
    </button>
  );
};

export default Button;
```

---

**Full Solution — Card Component:**

```tsx [src/components/ui/Card.tsx]
import { type ReactNode } from 'react';

// Base props chung cho cả hai chế độ
interface CardBaseProps {
  className?: string;
}

// Chế độ 1: Simple wrapper với children
interface CardWithChildrenProps extends CardBaseProps {
  children: ReactNode;
  title?: string;
  description?: string;
  footer?: ReactNode;
  headerAction?: ReactNode;
}

// Chế độ 2: Generic item + render props
interface CardWithItemProps<T> extends CardBaseProps {
  item: T;
  renderHeader?: (item: T) => ReactNode;
  renderContent: (item: T) => ReactNode;
  renderFooter?: (item: T) => ReactNode;
}

// Union type — một trong hai chế độ, không thể vừa có children vừa có item
type CardProps<T = unknown> = CardWithChildrenProps | CardWithItemProps<T>;

// Type guard để phân biệt hai chế độ
function isItemCard<T>(props: CardProps<T>): props is CardWithItemProps<T> {
  return 'item' in props && 'renderContent' in props;
}

const Card = <T,>(props: CardProps<T>) => {
  const { className = '' } = props;

  const baseStyles =
    'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden';

  // Chế độ 2: item + render props
  if (isItemCard(props)) {
    const { item, renderHeader, renderContent, renderFooter } = props;
    return (
      <div className={`${baseStyles} ${className}`}>
        {renderHeader && (
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            {renderHeader(item)}
          </div>
        )}
        <div className="px-5 py-4">{renderContent(item)}</div>
        {renderFooter && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
            {renderFooter(item)}
          </div>
        )}
      </div>
    );
  }

  // Chế độ 1: simple children wrapper
  const { children, title, description, footer, headerAction } =
    props as CardWithChildrenProps;

  return (
    <div className={`${baseStyles} ${className}`}>
      {/* Header với title/description và optional action slot */}
      {(title || headerAction) && (
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
          {headerAction && (
            <div className="ml-4 flex-shrink-0">{headerAction}</div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="px-5 py-4">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
```

**Kiểm tra cả hai component hoạt động đúng trong CRM:**

```tsx [src/App.tsx]
import type { FC } from 'react';
import { useTheme } from '@context/ThemeContext';
import Button from '@components/ui/Button';
import Card from '@components/ui/Card';
import StatusBadge from '@components/ui/StatusBadge';
import type { CustomerListItem } from '@types/customer';

const sampleCustomers: CustomerListItem[] = [
  { id: 'cust-001', name: 'Nguyễn Thị Lan', email: 'lan@abc.com', company: 'ABC Corp', status: 'active' },
  { id: 'cust-002', name: 'Trần Văn Minh', email: 'minh@xyz.com', company: 'XYZ Ltd', status: 'prospect' },
];

const App: FC = () => {
  const { toggleTheme, theme } = useTheme();

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Button variants showcase */}
      <Card title="Button Components" description="Tất cả variants và states">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Thêm khách hàng</Button>
          <Button variant="secondary">Lọc</Button>
          <Button variant="outline">Xuất Excel</Button>
          <Button variant="danger">Xóa</Button>
          <Button variant="ghost">Hủy</Button>
          <Button variant="primary" isLoading>Đang lưu...</Button>
          <Button variant="primary" disabled>Không khả dụng</Button>
        </div>
      </Card>

      {/* Card với generic item + render props */}
      <div className="space-y-3">
        {sampleCustomers.map((customer) => (
          <Card
            key={customer.id}
            item={customer}
            renderHeader={(c) => (
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{c.name}</span>
                <StatusBadge status={c.status} />
              </div>
            )}
            renderContent={(c) => (
              <div className="text-sm text-gray-600 space-y-1">
                <p>{c.email}</p>
                <p>{c.company}</p>
              </div>
            )}
            renderFooter={() => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline">Xem chi tiết</Button>
                <Button size="sm" variant="ghost">Chỉnh sửa</Button>
              </div>
            )}
          />
        ))}
      </div>

      {/* Theme toggle */}
      <Button variant="secondary" onClick={toggleTheme}>
        Chuyển sang {theme === 'light' ? '🌙 Dark' : '☀️ Light'} Mode
      </Button>
    </div>
  );
};

export default App;
```

**Giải thích những quyết định quan trọng trong solution:**

`Button` dùng `Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>` để có thể override `disabled` với logic kết hợp: button bị vô hiệu hóa khi *hoặc* `disabled={true}` *hoặc* `isLoading={true}`. Nếu giữ nguyên `disabled` từ HTMLAttributes, TypeScript sẽ báo conflict. `aria-busy={isLoading}` là bổ sung accessibility quan trọng — screen reader (trình đọc màn hình) sẽ thông báo cho người dùng khiếm thị biết đang có thao tác đang chờ.

`Card` dùng type guard function `isItemCard()` thay vì `'item' in props` trực tiếp trong JSX vì TypeScript cần type guard có tên để narrowing chính xác — inline `in` operator đôi khi không đủ để compiler hiểu kiểu cụ thể trong các nhánh phức tạp. Đây là kỹ thuật bạn sẽ thấy lại ở các chương sau khi làm việc với discriminated unions phức tạp hơn.

---

> **Tiếp theo:** [Chương 3: Quản Lý State với type inference hoàn hảo →](./chapter-03), nơi chúng ta đi sâu vào `useState`, `useReducer` với discriminated unions (union phân biệt) cho state machine pattern, và xây dựng bộ lọc danh sách khách hàng hoàn chỉnh đầu tiên cho CRM Dashboard.

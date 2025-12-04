# React Router v7 Navigation Skill

## Overview
Expert guidance for implementing routing and navigation with React Router v7, including modern data loading patterns, nested routes, and programmatic navigation.

## Tech Stack Context
- **React Router DOM**: 7.9.6
- **Features**: Data loaders, actions, nested routes, type-safe navigation

## Basic Setup

### Router Configuration
```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'products',
        element: <ProductsPage />
      },
      {
        path: 'products/:id',
        element: <ProductDetailPage />
      }
    ]
  }
]);

export const App = () => {
  return <RouterProvider router={router} />;
};
```

### Alternative: Routes Component
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
```

## Navigation

### Link Component
```typescript
import { Link } from 'react-router-dom';

// Basic link
<Link to="/products">View Products</Link>

// With dynamic path
<Link to={`/products/${product.id}`}>
  {product.title}
</Link>

// With state
<Link
  to="/products/new"
  state={{ from: 'homepage' }}
>
  Add Product
</Link>

// Relative navigation
<Link to=".." relative="path">Back</Link>
<Link to="../other">Sibling Route</Link>
```

### NavLink for Active States
```typescript
import { NavLink } from 'react-router-dom';

<NavLink
  to="/products"
  className={({ isActive }) =>
    isActive ? 'nav-link active' : 'nav-link'
  }
>
  Products
</NavLink>

// With inline styles
<NavLink
  to="/products"
  style={({ isActive }) => ({
    color: isActive ? 'red' : 'black'
  })}
>
  Products
</NavLink>
```

### Programmatic Navigation
```typescript
import { useNavigate } from 'react-router-dom';

const Component = () => {
  const navigate = useNavigate();

  const handleSubmit = async (data: FormData) => {
    await createProduct(data);
    navigate('/products');
  };

  const goBack = () => {
    navigate(-1); // Go back one step
  };

  const goHome = () => {
    navigate('/', { replace: true }); // Replace history
  };

  return (
    <button onClick={handleSubmit}>Submit</button>
  );
};
```

## Route Parameters

### URL Parameters
```typescript
import { useParams } from 'react-router-dom';

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  return <ProductDetail productId={id} />;
};

// Route definition
<Route path="products/:id" element={<ProductDetailPage />} />
```

### Query Parameters
```typescript
import { useSearchParams } from 'react-router-dom';

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category');
  const sort = searchParams.get('sort');

  const handleFilterChange = (newCategory: string) => {
    setSearchParams({ category: newCategory, sort });
  };

  return (
    <div>
      <p>Filtering by: {category}</p>
      <button onClick={() => handleFilterChange('vegetables')}>
        Show Vegetables
      </button>
    </div>
  );
};

// URL: /products?category=vegetables&sort=price
```

### Location State
```typescript
import { useLocation } from 'react-router-dom';

const ProductDetailPage = () => {
  const location = useLocation();
  const fromPage = location.state?.from;

  return (
    <div>
      {fromPage && <p>Came from: {fromPage}</p>}
    </div>
  );
};
```

## Nested Routes & Layouts

### Outlet for Nested Routes
```typescript
import { Outlet } from 'react-router-dom';

const RootLayout = () => {
  return (
    <div>
      <Header />
      <main>
        <Outlet /> {/* Child routes render here */}
      </main>
      <Footer />
    </div>
  );
};

// Route configuration
{
  path: '/',
  element: <RootLayout />,
  children: [
    { index: true, element: <HomePage /> },
    { path: 'about', element: <AboutPage /> }
  ]
}
```

### Context in Layouts
```typescript
import { Outlet, useOutletContext } from 'react-router-dom';

type LayoutContext = {
  user: User | null;
};

const RootLayout = () => {
  const [user, setUser] = useState<User | null>(null);

  return (
    <div>
      <Outlet context={{ user }} />
    </div>
  );
};

// Access in child routes
const ChildRoute = () => {
  const { user } = useOutletContext<LayoutContext>();
  return <div>{user?.name}</div>;
};
```

## Data Loading (Loaders)

### Route Loader
```typescript
import { LoaderFunctionArgs, useLoaderData } from 'react-router-dom';

// Loader function
export async function productLoader({ params }: LoaderFunctionArgs) {
  const product = await fetchProduct(params.id);
  return { product };
}

// Route configuration
{
  path: 'products/:id',
  element: <ProductDetailPage />,
  loader: productLoader
}

// Component
const ProductDetailPage = () => {
  const { product } = useLoaderData() as { product: Product };

  return <ProductDetail product={product} />;
};
```

### Loader with Error Handling
```typescript
export async function productsLoader() {
  try {
    const products = await fetchProducts();
    return { products };
  } catch (error) {
    throw new Response('Failed to load products', { status: 500 });
  }
}
```

## Actions (Form Submission)

### Route Action
```typescript
import { ActionFunctionArgs, redirect } from 'react-router-dom';

export async function createProductAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const product = {
    title: formData.get('title') as string,
    description: formData.get('description') as string
  };

  await createProduct(product);
  return redirect('/products');
}

// Route configuration
{
  path: 'products/new',
  element: <CreateProductPage />,
  action: createProductAction
}
```

### Form Component
```typescript
import { Form } from 'react-router-dom';

const CreateProductPage = () => {
  return (
    <Form method="post">
      <input name="title" required />
      <textarea name="description" />
      <button type="submit">Create</button>
    </Form>
  );
};
```

### useSubmit for Programmatic Submission
```typescript
import { useSubmit } from 'react-router-dom';

const Component = () => {
  const submit = useSubmit();

  const handleQuickAdd = (product: Product) => {
    const formData = new FormData();
    formData.append('title', product.title);

    submit(formData, { method: 'post' });
  };

  return <button onClick={handleQuickAdd}>Quick Add</button>;
};
```

## Error Handling

### Error Boundary
```typescript
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

const ErrorBoundary = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
      </div>
    );
  }

  return <div>Oops! Something went wrong.</div>;
};

// Route configuration
{
  path: '/',
  element: <RootLayout />,
  errorElement: <ErrorBoundary />
}
```

### 404 Not Found
```typescript
{
  path: '*',
  element: <NotFoundPage />
}
```

## Protected Routes

### Authentication Check
```typescript
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Usage
{
  path: 'dashboard',
  element: (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  )
}
```

### Redirect Based on Auth
```typescript
export async function dashboardLoader() {
  const user = await getCurrentUser();

  if (!user) {
    throw redirect('/login');
  }

  return { user };
}
```

## Loading States

### Navigation Loading
```typescript
import { useNavigation } from 'react-router-dom';

const RootLayout = () => {
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';

  return (
    <div>
      {isLoading && <LoadingBar />}
      <Outlet />
    </div>
  );
};
```

### Fetcher for Background Loading
```typescript
import { useFetcher } from 'react-router-dom';

const LikeButton = ({ productId }: { productId: string }) => {
  const fetcher = useFetcher();
  const isLiking = fetcher.state === 'submitting';

  return (
    <fetcher.Form method="post" action={`/products/${productId}/like`}>
      <button disabled={isLiking}>
        {isLiking ? 'Liking...' : 'Like'}
      </button>
    </fetcher.Form>
  );
};
```

## TypeScript Patterns

### Type-Safe Params
```typescript
import { useParams } from 'react-router-dom';

type ProductParams = {
  id: string;
};

const ProductPage = () => {
  const { id } = useParams<ProductParams>();
  // id is string | undefined
};
```

### Type-Safe Loader Data
```typescript
type ProductLoaderData = {
  product: Product;
};

export async function productLoader({ params }: LoaderFunctionArgs): Promise<ProductLoaderData> {
  const product = await fetchProduct(params.id);
  return { product };
}

const ProductPage = () => {
  const { product } = useLoaderData() as ProductLoaderData;
};
```

## Performance Optimization

### Lazy Loading Routes
```typescript
import { lazy, Suspense } from 'react';

const ProductsPage = lazy(() => import('./pages/ProductsPage'));

{
  path: 'products',
  element: (
    <Suspense fallback={<Loading />}>
      <ProductsPage />
    </Suspense>
  )
}
```

### Prefetching Data
```typescript
import { Link } from 'react-router-dom';

<Link
  to="/products"
  prefetch="intent" // Prefetch on hover
>
  Products
</Link>
```

## Common Patterns

### Breadcrumbs
```typescript
import { useMatches, UIMatch } from 'react-router-dom';

type RouteHandle = {
  breadcrumb: (data: any) => string;
};

const Breadcrumbs = () => {
  const matches = useMatches() as UIMatch<unknown, RouteHandle>[];

  const breadcrumbs = matches
    .filter(match => match.handle?.breadcrumb)
    .map(match => ({
      path: match.pathname,
      label: match.handle.breadcrumb(match.data)
    }));

  return (
    <nav>
      {breadcrumbs.map(crumb => (
        <Link key={crumb.path} to={crumb.path}>
          {crumb.label}
        </Link>
      ))}
    </nav>
  );
};
```

### Scroll Restoration
```typescript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};
```

### Modal Routes
```typescript
const location = useLocation();
const background = location.state?.background;

<Routes location={background || location}>
  <Route path="/" element={<HomePage />} />
  <Route path="/products/:id" element={<ProductPage />} />
</Routes>

{background && (
  <Routes>
    <Route path="/products/:id" element={<ProductModal />} />
  </Routes>
)}
```

## Testing

### Mock Router
```typescript
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

const renderWithRouter = (component: React.ReactElement, initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      {component}
    </MemoryRouter>
  );
};

it('renders product page', () => {
  renderWithRouter(<ProductPage />, '/products/123');
});
```

## Best Practices

1. **Use loaders for data** - Fetch data in loaders, not useEffect
2. **Relative links** - Use relative paths where possible
3. **Error boundaries** - Always provide error handling
4. **Loading states** - Show feedback during navigation
5. **Type safety** - Use TypeScript for params and loader data
6. **Code splitting** - Lazy load routes for better performance
7. **Nested routes** - Use layouts for shared UI

## When to Use This Skill
- Setting up routing and navigation
- Implementing data loading patterns
- Creating protected routes
- Handling form submissions
- Managing route parameters
- Building nested layouts
- Error handling in routes
- Performance optimization with lazy loading
- Type-safe navigation

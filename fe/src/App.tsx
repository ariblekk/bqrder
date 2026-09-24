import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { AdminLayout } from "./layouts/AdminLayout";
import Branches from "./pages/Branches";
import Categories from "./pages/Categories";
import Checkout from "./pages/Checkout";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Menu from "./pages/Menu";
import OrderStatus from "./pages/OrderStatus";
import Pos from "./pages/Pos";
import PosOrders from "./pages/PosOrders";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import Tables from "./pages/Tables";
import Users from "./pages/Users";
import { TooltipProvider } from "./components/ui/tooltip";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/", element: <Landing /> },
  { path: "/menu", element: <Menu /> },
  { path: "/checkout", element: <Checkout /> },
  { path: "/o/:orderNumber", element: <OrderStatus /> },
  {
    path: "/admin",
    element: (
      <RequireAuth roles={["super_admin", "branch_admin"]}>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: "branches",
        element: (
          <RequireAuth roles={["super_admin"]}>
            <Branches />
          </RequireAuth>
        ),
      },
      { path: "users", element: <Users /> },
      { path: "tables", element: <Tables /> },
      { path: "categories", element: <Categories /> },
      { path: "products", element: <Products /> },
      { path: "reports", element: <Reports /> },
    ],
  },
  {
    path: "/pos",
    element: (
      <RequireAuth roles={["super_admin", "branch_admin", "cashier"]}>
        <Pos />
      </RequireAuth>
    ),
  },
  {
    path: "/pos/orders",
    element: (
      <RequireAuth roles={["super_admin", "branch_admin", "cashier"]}>
        <PosOrders />
      </RequireAuth>
    ),
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="bottom-right" richColors />
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </AuthProvider>
  );
}

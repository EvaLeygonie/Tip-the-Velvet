import { Navigate } from "react-router-dom";
// import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children }: { children: React.ReactNode }){
  const isLoggedIn = true;

  if (!isLoggedIn) {
    return <Navigate to="/admin/login" replace />;
  }

  // const { session, loading } = useAuth();

  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-background flex items-center justify-center">
  //       <div className="text-muted-foreground">Laddar...</div>
  //     </div>
  //   );
  // }

  // if (!session) {
  //   return <Navigate to="/admin/login" replace />;
  // }

  return <>{children}</>;
}

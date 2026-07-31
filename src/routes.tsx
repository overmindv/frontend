import { Navigate, Route, Routes } from "react-router-dom";
import { PrivateRoute } from "./components/PrivateRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { CourseCreatePage, CoursesPage, ProgramCreatePage, ProgramsPage, TopicCreatePage, TopicPage, TopicsPage, UniversitiesPage, UniversityFormPage } from "./pages/admin/CatalogPages";
import { AdminUsersPage } from "./pages/admin/UsersPage";

function HomeRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/profile" : "/login"} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/admin/users" element={<PrivateRoute><AdminUsersPage /></PrivateRoute>} />
      <Route path="/admin/catalog/universities" element={<PrivateRoute><UniversitiesPage /></PrivateRoute>} />
      <Route path="/admin/catalog/universities/new" element={<PrivateRoute><UniversityFormPage create /></PrivateRoute>} />
      <Route path="/admin/catalog/universities/:id" element={<PrivateRoute><UniversityFormPage /></PrivateRoute>} />
      <Route path="/admin/catalog/universities/:id/programs" element={<PrivateRoute><ProgramsPage /></PrivateRoute>} />
      <Route path="/admin/catalog/programs" element={<PrivateRoute><ProgramsPage /></PrivateRoute>} />
      <Route path="/admin/catalog/programs/new" element={<PrivateRoute><ProgramCreatePage /></PrivateRoute>} />
      <Route path="/admin/catalog/programs/:id/courses" element={<PrivateRoute><CoursesPage /></PrivateRoute>} />
      <Route path="/admin/catalog/courses" element={<PrivateRoute><CoursesPage /></PrivateRoute>} />
      <Route path="/admin/catalog/courses/new" element={<PrivateRoute><CourseCreatePage /></PrivateRoute>} />
      <Route path="/admin/catalog/courses/:id/topics" element={<PrivateRoute><TopicsPage /></PrivateRoute>} />
      <Route path="/admin/catalog/topics" element={<PrivateRoute><TopicsPage /></PrivateRoute>} />
      <Route path="/admin/catalog/topics/new" element={<PrivateRoute><TopicCreatePage /></PrivateRoute>} />
      <Route path="/admin/catalog/topics/:id" element={<PrivateRoute><TopicPage /></PrivateRoute>} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

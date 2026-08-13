import { Navigate, Route, Routes } from "react-router-dom";
import { PrivateRoute } from "./components/PrivateRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { CourseFormPage, CoursesPage, ProgramFormPage, ProgramsPage, TopicFormPage, TopicsPage, UniversitiesPage, UniversityFormPage } from "./pages/admin/CatalogPages";
import { AdminTaskFormPage, AdminTasksPage } from "./pages/admin/TasksAdminPages";
import { AdminUsersPage } from "./pages/admin/UsersPage";
import { CandidateEditorPage, CollectedTasksPage } from "./pages/admin/CollectedTasksPage";
import { SubmissionDetailPage, SubmissionHistoryPage, TaskSolvePage, TasksPage } from "./pages/tasks/TasksPages";

function HomeRedirect() {
  return <Navigate to="/tasks" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/tasks/:id" element={<TaskSolvePage />} />
      <Route path="/history" element={<PrivateRoute><SubmissionHistoryPage /></PrivateRoute>} />
      <Route path="/history/:id" element={<PrivateRoute><SubmissionDetailPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/admin/tasks" element={<PrivateRoute><AdminTasksPage /></PrivateRoute>} />
      <Route path="/admin/tasks/new" element={<PrivateRoute><AdminTaskFormPage create /></PrivateRoute>} />
      <Route path="/admin/tasks/:id" element={<PrivateRoute><AdminTaskFormPage /></PrivateRoute>} />
      <Route path="/admin/users" element={<PrivateRoute><AdminUsersPage /></PrivateRoute>} />
      <Route path="/admin/collected-tasks" element={<PrivateRoute><CollectedTasksPage /></PrivateRoute>} />
      <Route path="/admin/collected-tasks/:id" element={<PrivateRoute><CandidateEditorPage /></PrivateRoute>} />
      <Route path="/admin/catalog/universities" element={<PrivateRoute><UniversitiesPage /></PrivateRoute>} />
      <Route path="/admin/catalog/universities/new" element={<PrivateRoute><UniversityFormPage create /></PrivateRoute>} />
      <Route path="/admin/catalog/universities/:id" element={<PrivateRoute><UniversityFormPage /></PrivateRoute>} />
      <Route path="/admin/catalog/universities/:id/programs" element={<PrivateRoute><ProgramsPage /></PrivateRoute>} />
      <Route path="/admin/catalog/programs" element={<PrivateRoute><ProgramsPage /></PrivateRoute>} />
      <Route path="/admin/catalog/programs/new" element={<PrivateRoute><ProgramFormPage create /></PrivateRoute>} />
      <Route path="/admin/catalog/programs/:id" element={<PrivateRoute><ProgramFormPage /></PrivateRoute>} />
      <Route path="/admin/catalog/programs/:id/courses" element={<PrivateRoute><CoursesPage /></PrivateRoute>} />
      <Route path="/admin/catalog/courses" element={<PrivateRoute><CoursesPage /></PrivateRoute>} />
      <Route path="/admin/catalog/courses/new" element={<PrivateRoute><CourseFormPage create /></PrivateRoute>} />
      <Route path="/admin/catalog/courses/:id" element={<PrivateRoute><CourseFormPage /></PrivateRoute>} />
      <Route path="/admin/catalog/courses/:id/topics" element={<PrivateRoute><TopicsPage /></PrivateRoute>} />
      <Route path="/admin/catalog/topics" element={<PrivateRoute><TopicsPage /></PrivateRoute>} />
      <Route path="/admin/catalog/topics/new" element={<PrivateRoute><TopicFormPage create /></PrivateRoute>} />
      <Route path="/admin/catalog/topics/:id" element={<PrivateRoute><TopicFormPage /></PrivateRoute>} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

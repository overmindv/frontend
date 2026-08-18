import { Navigate, Route, Routes } from "react-router-dom";
import { PrivateRoute } from "./components/PrivateRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage, ProfileSettingsPage, PublicUserProfilePage } from "./pages/ProfilePage";
import { AvatarOnboardingPage } from "./pages/AvatarOnboardingPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CourseFormPage, CoursesPage, ProgramFormPage, ProgramsPage, TopicFormPage, TopicsPage, UniversitiesPage, UniversityFormPage } from "./pages/admin/CatalogPages";
import { AdminTaskFormPage, AdminTasksPage } from "./pages/admin/TasksAdminPages";
import { AdminUsersPage } from "./pages/admin/UsersPage";
import { CandidateEditorPage, CollectedTasksPage } from "./pages/admin/CollectedTasksPage";
import { SubmissionDetailPage, SubmissionHistoryPage, TaskSolvePage, TasksPage } from "./pages/tasks/TasksPages";
import { HomePage } from "./pages/HomePage";
import { CatalogBrowsePage, CatalogDetailPage } from "./pages/CatalogBrowsePage";
import { UsersSearchPage } from "./pages/UsersSearchPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/universities" element={<CatalogBrowsePage kind="universities" />} />
      <Route path="/universities/:id" element={<CatalogDetailPage kind="universities" />} />
      <Route path="/programs" element={<CatalogBrowsePage kind="programs" />} />
      <Route path="/programs/:id" element={<CatalogDetailPage kind="programs" />} />
      <Route path="/courses" element={<CatalogBrowsePage kind="courses" />} />
      <Route path="/courses/:id" element={<CatalogDetailPage kind="courses" />} />
      <Route path="/topics" element={<CatalogBrowsePage kind="topics" />} />
      <Route path="/topics/:id" element={<CatalogDetailPage kind="topics" />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/tasks/:id" element={<TaskSolvePage />} />
      <Route path="/history" element={<PrivateRoute><SubmissionHistoryPage /></PrivateRoute>} />
      <Route path="/history/:id" element={<PrivateRoute><SubmissionDetailPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/profile/settings" element={<PrivateRoute><ProfileSettingsPage /></PrivateRoute>} />
      <Route path="/onboarding/avatar" element={<PrivateRoute><AvatarOnboardingPage /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute><UsersSearchPage /></PrivateRoute>} />
      <Route path="/users/:id" element={<PrivateRoute><PublicUserProfilePage /></PrivateRoute>} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

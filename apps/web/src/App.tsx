import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomeScreen } from './screens/HomeScreen';
import { NewProjectScreen } from './screens/NewProjectScreen';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { GalleryScreen } from './screens/GalleryScreen';
import { EditorScreen } from './screens/EditorScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/new" element={<NewProjectScreen />} />
        <Route path="/projects" element={<ProjectsScreen />} />
        <Route path="/gallery" element={<GalleryScreen />} />
        <Route path="/editor/:id" element={<EditorScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
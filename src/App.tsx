import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequirePlayer } from './components/RequirePlayer';
import { Welcome } from './views/Welcome';
import { Lobby } from './views/Lobby';
import { Table } from './views/Table';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Welcome />} />
        <Route element={<RequirePlayer />}>
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/room/:code" element={<Table />} />
        </Route>
        <Route path="*" element={<Welcome />} />
      </Route>
    </Routes>
  );
}

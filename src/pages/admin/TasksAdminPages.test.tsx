import { MockedProvider } from '@apollo/client/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import { ADMIN_IT_TASKS_QUERY, CREATE_IT_TASK, IT_TASK_TOPICS_QUERY } from '../../api/tasks';
import { AuthProvider } from '../../context/AuthContext';
import { meMock } from '../../test/authMocks';
import { AdminTaskFormPage, AdminTasksPage } from './TasksAdminPages';

test('ошибка авторского списка отличается от пустого результата, повтор сохраняет фильтр', async () => {
  const user = userEvent.setup();
  const request = (filter: object) => ({ query: ADMIN_IT_TASKS_QUERY, variables: { filter, pagination: { limit: 20, offset: 0 } } });
  const task = { __typename: 'ITTaskSummary', id: 'draft-one', status: 'draft', taskVersionId: 'v1', versionNumber: 1, topicId: null, title: 'Черновик суммы', taskType: 'single_choice', difficulty: 'easy', createdAt: '', updatedAt: '' };
  render(<MockedProvider addTypename={false} mocks={[
    meMock({ id: 'admin', isAdmin: true, isSuperuser: false }),
    { request: request({}), result: { data: { adminITTasks: { items: [], limit: 20, offset: 0 } } } },
    { request: request({ status: 'draft' }), error: new Error('private upstream detail') },
    { request: request({ status: 'draft' }), result: { data: { adminITTasks: { items: [task], limit: 20, offset: 0 } } } },
  ]}><MemoryRouter><AuthProvider><AdminTasksPage /></AuthProvider></MemoryRouter></MockedProvider>);
  await screen.findByRole('heading', { name: 'Ничего не найдено' });
  await user.selectOptions(screen.getByLabelText('Статус'), 'draft');
  await screen.findByRole('alert');
  expect(screen.queryByText('Ничего не найдено')).not.toBeInTheDocument();
  expect(screen.queryByText('private upstream detail')).not.toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Пагинация' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(await screen.findByText('Черновик суммы')).toBeInTheDocument();
  expect(screen.getByLabelText('Статус')).toHaveValue('draft');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('повторяющиеся варианты объясняются, форма сохраняется и отправляется только после исправления', async () => {
  const user = userEvent.setup();
  const createResult = vi.fn(() => ({ data: { createITTask: { __typename: 'ITTask', id: 'created', status: 'draft', taskVersionId: 'v1', versionNumber: 1, topicId: null, title: 'Сумма', statement: 'Сколько будет 2 + 2?', taskType: 'single_choice', difficulty: 'easy', createdAt: '', updatedAt: '', options: [] } } }));
  render(<MockedProvider addTypename={false} mocks={[meMock({ id: 'admin', isAdmin: true, isSuperuser: false }),
    { request: { query: IT_TASK_TOPICS_QUERY }, result: { data: { topics: [] } } },
    { request: { query: CREATE_IT_TASK, variables: { input: { topicId: null, title: 'Сумма', statement: 'Сколько будет 2 + 2?', taskType: 'single_choice', difficulty: 'easy', options: [{ text: '4', isCorrect: true }, { text: '5', isCorrect: false }] } } }, result: createResult },
  ]}><MemoryRouter initialEntries={['/admin/tasks/new']}><AuthProvider><Routes><Route path='/admin/tasks/new' element={<AdminTaskFormPage create />} /><Route path='/admin/tasks/created' element={<h1>Сохранённый черновик</h1>} /></Routes></AuthProvider></MemoryRouter></MockedProvider>);
  await screen.findByRole('button', { name: 'Создать черновик' });
  await user.type(screen.getByLabelText('Название'), 'Сумма');
  await user.type(screen.getByLabelText('Условие'), 'Сколько будет 2 + 2?');
  await user.type(screen.getByLabelText('Вариант 1'), '4');
  await user.type(screen.getByLabelText('Вариант 2'), '4');
  await user.click(screen.getByRole('button', { name: 'Создать черновик' }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Варианты ответа не должны повторяться.');
  expect(alert).toHaveFocus();
  expect(screen.getByLabelText('Название')).toHaveValue('Сумма');
  expect(screen.getByLabelText('Условие')).toHaveValue('Сколько будет 2 + 2?');
  expect(createResult).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('Вариант 2'));
  await user.type(screen.getByLabelText('Вариант 2'), '5');
  await user.click(screen.getByRole('button', { name: 'Создать черновик' }));
  expect(await screen.findByRole('heading', { name: 'Сохранённый черновик' })).toBeInTheDocument();
});

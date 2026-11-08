import { MockedProvider } from '@apollo/client/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { IT_TASKS_QUERY, IT_TASK_TOPICS_QUERY } from '../../api/tasks';
import { TasksPage } from './TasksPages';

const task = { __typename: 'ITTaskSummary', id: 'one', status: 'published', taskVersionId: 'v1', versionNumber: 1, topicId: null, title: 'Первая задача', taskType: 'single_choice', difficulty: 'easy', createdAt: '', updatedAt: '' };
const topics = { request: { query: IT_TASK_TOPICS_QUERY }, result: { data: { topics: [] } } };
const list = (filter: object, offset: number, items = [task]) => ({ request: { query: IT_TASKS_QUERY, variables: { filter, pagination: { limit: 12, offset } } }, result: { data: { itTasks: { __typename: "ITTaskList", items, limit: 12, offset } } } });

test('поиск запрашивает весь каталог с первой страницы и сохраняет фильтры', async () => {
  const user = userEvent.setup();
  render(<MockedProvider addTypename={false} mocks={[topics,
    list({}, 0), list({ difficulty: 'easy' }, 0, Array.from({ length: 12 }, (_, i) => ({ ...task, id: `item-${i}`, title: `Задача ${i}` }))),
    list({ difficulty: 'easy' }, 12, [{ ...task, title: 'Вторая страница' }]),
    list({ difficulty: 'easy', search: 'Граф' }, 0, [{ ...task, id: 'elsewhere', title: 'Обход графа' }]),
  ]}><MemoryRouter><TasksPage /></MemoryRouter></MockedProvider>);
  await screen.findByRole('link', { name: 'Открыть задачу Первая задача' });
  await user.selectOptions(screen.getByLabelText('Сложность'), 'easy');
  await screen.findByRole('link', { name: 'Открыть задачу Задача 0' });
  await user.click(screen.getByRole('button', { name: /Дальше/ }));
  await screen.findByRole('link', { name: 'Открыть задачу Вторая страница' });
  await user.type(screen.getByRole('textbox', { name: 'Поиск задач' }), '  Граф  ');
  await user.click(screen.getByRole('button', { name: 'Найти' }));
  expect(await screen.findByRole('link', { name: 'Открыть задачу Обход графа' })).toHaveAttribute('href', '/tasks/elsewhere');
  expect(screen.getByLabelText('Сложность')).toHaveValue('easy');
  expect(screen.queryByText('Страница 2')).not.toBeInTheDocument();
});

test('ошибка поиска не выдаётся за пустой список, повтор сохраняет запрос', async () => {
  const user = userEvent.setup();
  const request = list({ search: 'Граф' }, 0).request;
  render(<MockedProvider addTypename={false} mocks={[topics, { request, error: new Error('private upstream detail') }, list({ search: 'Граф' }, 0, [{ ...task, title: 'Обход графа' }])]}><MemoryRouter initialEntries={['/tasks?search=Граф']}><TasksPage /></MemoryRouter></MockedProvider>);
  await screen.findByRole('alert');
  expect(screen.queryByText('Задач пока нет')).not.toBeInTheDocument();
  expect(screen.queryByText('private upstream detail')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(await screen.findByRole('link', { name: 'Открыть задачу Обход графа' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Поиск задач' })).toHaveValue('Граф');
});

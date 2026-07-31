import { useMutation, useQuery } from "@apollo/client";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ADD_PREREQUISITE,
  CHANGE_STATUS,
  COURSES_QUERY,
  CREATE_COURSE,
  CREATE_PROGRAM,
  CREATE_TOPIC,
  CREATE_UNIVERSITY,
  DELETE_ENTITY,
  PROGRAMS_QUERY,
  REMOVE_PREREQUISITE,
  TOPIC_QUERY,
  TOPICS_QUERY,
  UNIVERSITIES_QUERY,
  UNIVERSITY_QUERY,
  UPDATE_TOPIC,
  UPDATE_UNIVERSITY,
  type CatalogStatus,
  type Course,
  type Program,
  type Topic,
  type University,
} from "../../api/catalog";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { Spinner } from "../../components/common/Spinner";
import { useAuth } from "../../context/AuthContext";

const statuses: CatalogStatus[] = ["draft", "active", "hidden", "archived"];

function CatalogHeader({ title, back }: { title: string; back?: string }) {
  return <div className="catalog-heading"><div>{back && <Link to={back}>← Назад</Link>}<h1>{title}</h1></div></div>;
}

function Actions({ kind, id, status, refetch }: { kind: keyof typeof DELETE_ENTITY; id: string; status: CatalogStatus; refetch: () => Promise<unknown> }) {
  const { isAdmin } = useAuth();
  const [remove, removeState] = useMutation(DELETE_ENTITY[kind]);
  const [changeStatus, statusState] = useMutation(CHANGE_STATUS[kind]);

  if (!isAdmin) {
    return null;
  }

  return <div className="catalog-actions">
    <select aria-label="Статус" value={status} onChange={(event) => void changeStatus({ variables: { id, status: event.target.value } }).then(refetch)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
    <button className="button button--danger" disabled={removeState.loading} onClick={() => { if (window.confirm("Удалить объект?")) void remove({ variables: { id } }).then(refetch); }}>Удалить</button>
    {(removeState.error || statusState.error) && <ErrorMessage message={(removeState.error ?? statusState.error)?.message ?? "Ошибка"} />}
  </div>;
}

export function UniversitiesPage() {
  const { isAdmin } = useAuth();
  const { data, loading, error, refetch } = useQuery<{ universities: University[] }>(UNIVERSITIES_QUERY);

  if (loading) return <Spinner />;

  return <main className="page-shell panel catalog"><CatalogHeader title="Университеты" />{isAdmin && <div className="catalog-actions"><Link className="button" to="/admin/catalog/universities/new">Добавить университет</Link><Link className="button" to="/admin/catalog/programs/new">Добавить программу</Link><Link className="button" to="/admin/catalog/courses/new">Добавить курс</Link><Link className="button" to="/admin/catalog/topics/new">Добавить тему</Link></div>}<Link to="/admin/catalog/programs">Backlog программ →</Link>{error && <ErrorMessage message={error.message} />}<div className="catalog-list">{data?.universities.map((item) => <article key={item.id} className="catalog-row"><div><Link to={`/admin/catalog/universities/${item.id}`}><strong>{item.name}</strong></Link><p>{item.shortName} · {item.city}</p><Link to={`/admin/catalog/universities/${item.id}/programs`}>Программы →</Link></div><Actions kind="university" id={item.id} status={item.status} refetch={refetch} /></article>)}</div></main>;
}

export function UniversityFormPage({ create = false }: { create?: boolean }) {
  const { id = "" } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const query = useQuery<{ university: University }>(UNIVERSITY_QUERY, { variables: { id }, skip: create });
  const [createItem, createState] = useMutation(CREATE_UNIVERSITY);
  const [updateItem, updateState] = useMutation(UPDATE_UNIVERSITY);
  const item = query.data?.university;
  const error = query.error ?? createState.error ?? updateState.error;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const input = {
      name: formString(values.name),
      shortName: formString(values.shortName),
      city: formString(values.city),
      country: formString(values.country),
      websiteUrl: formString(values.websiteUrl),
      logoFileId: formString(values.logoFileId) || null,
    };
    if (create) await createItem({ variables: { input: { ...input, status: values.status } } }); else await updateItem({ variables: { id, input } });
    navigate("/admin/catalog/universities");
  };

  if (!create && query.loading) return <Spinner />;
  if (create && !isAdmin) return <main className="page-shell panel catalog"><CatalogHeader title="Создание университета" back="/admin/catalog/universities" /><ErrorMessage message="Создание доступно только администраторам." /></main>;

  return <main className="page-shell panel catalog"><CatalogHeader title={create ? "Новый университет" : isAdmin ? "Редактирование университета" : "Университет"} back="/admin/catalog/universities" />{error && <ErrorMessage message={error.message} />}{isAdmin ? <form className="form catalog-form" onSubmit={(event) => void submit(event)}><Field name="name" label="Название" required defaultValue={item?.name} /><Field name="shortName" label="Краткое название" defaultValue={item?.shortName} /><Field name="city" label="Город" defaultValue={item?.city} /><Field name="country" label="Страна" defaultValue={item?.country} /><Field name="websiteUrl" label="Сайт" type="url" defaultValue={item?.websiteUrl} /><Field name="logoFileId" label="ID логотипа Mirage" defaultValue={item?.logoFileId} />{create && <Select name="status" label="Статус" values={statuses} />}<button className="button" disabled={createState.loading || updateState.loading}>Сохранить</button></form> : item && <ReadOnly fields={[["Название", item.name], ["Краткое название", item.shortName], ["Город", item.city], ["Страна", item.country], ["Сайт", item.websiteUrl]]} />}</main>;
}

export function ProgramsPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const parentId = id || null;
  const { data, loading, error, refetch } = useQuery<{ programs: Program[] }>(PROGRAMS_QUERY, { variables: { parentId } });
  const [createItem, state] = useMutation(CREATE_PROGRAM);
  const submit = (event: FormEvent<HTMLFormElement>) => createFromForm(event, (input) => createItem({ variables: { input: { universityId: parentId, ...input, degreeLevel: "other" } } }).then(() => refetch()));

  if (loading) return <Spinner />;

  return <main className="page-shell panel catalog"><CatalogHeader title={parentId ? "Программы университета" : "Backlog программ"} back="/admin/catalog/universities" />{(error || state.error) && <ErrorMessage message={(error ?? state.error)?.message ?? "Ошибка"} />}{isAdmin && <><Link className="button" to="/admin/catalog/programs/new">Добавить программу</Link><InlineCreate onSubmit={submit} label="Быстро: название программы" /></>}{data?.programs.map((item) => <article className="catalog-row" key={item.id}><div><strong>{item.name}</strong><p>{item.faculty || "Факультет не указан"}{!item.universityId && " · без университета"}</p><Link to={`/admin/catalog/programs/${item.id}/courses`}>Курсы →</Link></div><Actions kind="program" id={item.id} status={item.status} refetch={refetch} /></article>)}</main>;
}

export function CoursesPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const parentId = id || null;
  const { data, loading, error, refetch } = useQuery<{ courses: Course[] }>(COURSES_QUERY, { variables: { parentId } });
  const [createItem, state] = useMutation(CREATE_COURSE);
  const submit = (event: FormEvent<HTMLFormElement>) => createFromForm(event, (input) => createItem({ variables: { input: { programId: parentId, ...input } } }).then(() => refetch()));

  if (loading) return <Spinner />;

  return <main className="page-shell panel catalog"><CatalogHeader title={parentId ? "Курсы программы" : "Backlog курсов"} back="/admin/catalog/universities" />{(error || state.error) && <ErrorMessage message={(error ?? state.error)?.message ?? "Ошибка"} />}{isAdmin && <><Link className="button" to="/admin/catalog/courses/new">Добавить курс</Link><InlineCreate onSubmit={submit} label="Быстро: название курса" /></>}{data?.courses.map((item) => <article className="catalog-row" key={item.id}><div><strong>{item.name}</strong><p>{item.slug}{!item.programId && " · без программы"}</p><Link to={`/admin/catalog/courses/${item.id}/topics`}>Темы →</Link></div><Actions kind="course" id={item.id} status={item.status} refetch={refetch} /></article>)}</main>;
}

export function TopicsPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const parentId = id || null;
  const { data, loading, error, refetch } = useQuery<{ topics: Topic[]; topicTree: Array<{ topic: Topic; children: Array<{ topic: Topic }> }> }>(TOPICS_QUERY, { variables: { parentId } });
  const [createItem, state] = useMutation(CREATE_TOPIC);
  const submit = (event: FormEvent<HTMLFormElement>) => createFromForm(event, (input) => createItem({ variables: { input: { courseId: parentId, ...input } } }).then(() => refetch()));

  if (loading) return <Spinner />;

  return <main className="page-shell panel catalog"><CatalogHeader title={parentId ? "Темы курса" : "Backlog тем"} back="/admin/catalog/universities" />{(error || state.error) && <ErrorMessage message={(error ?? state.error)?.message ?? "Ошибка"} />}{isAdmin && <><Link className="button" to="/admin/catalog/topics/new">Добавить тему</Link><InlineCreate onSubmit={submit} label="Быстро: название темы" /></>}<section><h2>Иерархия</h2><ul className="topic-tree">{data?.topicTree.map((node) => <li key={node.topic.id}><Link to={`/admin/catalog/topics/${node.topic.id}`}>{node.topic.title}</Link>{node.children.length > 0 && <ul>{node.children.map((child) => <li key={child.topic.id}><Link to={`/admin/catalog/topics/${child.topic.id}`}>{child.topic.title}</Link></li>)}</ul>}</li>)}</ul></section>{data?.topics.map((item) => <article className="catalog-row" key={item.id}><Link to={`/admin/catalog/topics/${item.id}`}><strong>{item.title}</strong><p>{item.slug}{!item.courseId && " · без курса"}</p></Link><Actions kind="topic" id={item.id} status={item.status} refetch={refetch} /></article>)}</main>;
}

export function ProgramCreatePage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<{ universities: University[] }>(UNIVERSITIES_QUERY);
  const [createItem, state] = useMutation(CREATE_PROGRAM);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await createItem({ variables: { input: { universityId: optionalID(values.universityId), name: formString(values.name), shortName: formString(values.shortName), faculty: formString(values.faculty), degreeLevel: formString(values.degreeLevel) || "other", startYear: optionalNumber(values.startYear), status: formString(values.status) || "draft" } } });
    navigate("/admin/catalog/programs");
  };

  if (!isAdmin) return <Denied />;
  if (loading) return <Spinner />;

  return <main className="page-shell panel catalog"><CatalogHeader title="Новая программа" back="/admin/catalog/programs" />{(error || state.error) && <ErrorMessage message={(error ?? state.error)?.message ?? "Ошибка"} />}<form className="form catalog-form" onSubmit={(event) => void submit(event)}><Field name="name" label="Название" required /><RelationSelect name="universityId" label="Университет" items={data?.universities ?? []} /><Field name="shortName" label="Краткое название" /><Field name="faculty" label="Факультет" /><Select name="degreeLevel" label="Уровень" values={["other", "bachelor", "master", "specialist", "phd"]} /><Field name="startYear" label="Год старта" type="number" /><Select name="status" label="Статус" values={statuses} /><button className="button">Создать</button></form></main>;
}

export function CourseCreatePage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [universityID, setUniversityID] = useState("");
  const universities = useQuery<{ universities: University[] }>(UNIVERSITIES_QUERY);
  const programs = useQuery<{ programs: Program[] }>(PROGRAMS_QUERY, { variables: { parentId: null } });
  const [createItem, state] = useMutation(CREATE_COURSE);
  const filteredPrograms = (programs.data?.programs ?? []).filter((item) => !universityID || item.universityId === universityID);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await createItem({ variables: { input: { programId: optionalID(values.programId), name: formString(values.name), slug: formString(values.slug), description: formString(values.description), semester: optionalNumber(values.semester), yearNumber: optionalNumber(values.yearNumber), status: formString(values.status) || "draft" } } });
    navigate("/admin/catalog/courses");
  };

  if (!isAdmin) return <Denied />;
  if (universities.loading || programs.loading) return <Spinner />;

  return <main className="page-shell panel catalog"><CatalogHeader title="Новый курс" back="/admin/catalog/courses" />{(universities.error || programs.error || state.error) && <ErrorMessage message="Ошибка" />}<form className="form catalog-form" onSubmit={(event) => void submit(event)}><Field name="name" label="Название" required /><label className="field"><span>Университет</span><select name="universityId" value={universityID} onChange={(event) => setUniversityID(event.target.value)}><option value="">Без фильтра</option>{universities.data?.universities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><RelationSelect name="programId" label="Программа" items={filteredPrograms} emptyLabel="Без программы" /><Field name="slug" label="Slug" /><Field name="description" label="Описание" /><Field name="semester" label="Семестр" type="number" /><Field name="yearNumber" label="Год обучения" type="number" /><Select name="status" label="Статус" values={statuses} /><button className="button">Создать</button></form></main>;
}

export function TopicCreatePage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [universityID, setUniversityID] = useState("");
  const [programID, setProgramID] = useState("");
  const universities = useQuery<{ universities: University[] }>(UNIVERSITIES_QUERY);
  const programs = useQuery<{ programs: Program[] }>(PROGRAMS_QUERY, { variables: { parentId: null } });
  const courses = useQuery<{ courses: Course[] }>(COURSES_QUERY, { variables: { parentId: null } });
  const [createItem, state] = useMutation(CREATE_TOPIC);
  const filteredPrograms = (programs.data?.programs ?? []).filter((item) => !universityID || item.universityId === universityID);
  const filteredCourses = (courses.data?.courses ?? []).filter((item) => !programID || item.programId === programID);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await createItem({ variables: { input: { courseId: optionalID(values.courseId), title: formString(values.title), slug: formString(values.slug), description: formString(values.description), orderIndex: optionalNumber(values.orderIndex) ?? 0, difficulty: formString(values.difficulty) || "basic", status: formString(values.status) || "draft" } } });
    navigate("/admin/catalog/topics");
  };

  if (!isAdmin) return <Denied />;
  if (universities.loading || programs.loading || courses.loading) return <Spinner />;

  return <main className="page-shell panel catalog"><CatalogHeader title="Новая тема" back="/admin/catalog/topics" />{(universities.error || programs.error || courses.error || state.error) && <ErrorMessage message="Ошибка" />}<form className="form catalog-form" onSubmit={(event) => void submit(event)}><Field name="title" label="Название" required /><label className="field"><span>Университет</span><select name="universityId" value={universityID} onChange={(event) => { setUniversityID(event.target.value); setProgramID(""); }}><option value="">Без фильтра</option>{universities.data?.universities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Программа</span><select name="programId" value={programID} onChange={(event) => setProgramID(event.target.value)}><option value="">Без фильтра</option>{filteredPrograms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><RelationSelect name="courseId" label="Курс" items={filteredCourses} emptyLabel="Без курса" /><Field name="slug" label="Slug" /><Field name="description" label="Описание" /><Field name="orderIndex" label="Порядок" type="number" defaultValue={0} /><Select name="difficulty" label="Сложность" values={["basic", "intro", "medium", "hard", "advanced"]} /><Select name="status" label="Статус" values={statuses} /><button className="button">Создать</button></form></main>;
}

export function TopicPage() {
  const { id = "" } = useParams();
  const { isAdmin } = useAuth();
  const { data, loading, error, refetch } = useQuery<{ topic: Topic; topicPrerequisites: Array<{ prerequisiteTopicId: string }> }>(TOPIC_QUERY, { variables: { id } });
  const [updateItem, updateState] = useMutation(UPDATE_TOPIC);
  const [add, addState] = useMutation(ADD_PREREQUISITE);
  const [remove, removeState] = useMutation(REMOVE_PREREQUISITE);

  if (loading) return <Spinner />;

  const topic = data?.topic;
  const back = topic?.courseId ? `/admin/catalog/courses/${topic.courseId}/topics` : "/admin/catalog/topics";
  const combinedError = error ?? updateState.error ?? addState.error ?? removeState.error;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await updateItem({ variables: { id, input: { title: values.title, slug: values.slug, description: values.description, parentTopicId: values.parentTopicId || null, clearParentTopic: !values.parentTopicId, orderIndex: Number(values.orderIndex), difficulty: values.difficulty } } });
    await refetch();
  };

  return <main className="page-shell panel catalog"><CatalogHeader title="Тема" back={back} />{combinedError && <ErrorMessage message={combinedError.message} />}{topic && (isAdmin ? <form className="form catalog-form" onSubmit={(event) => void submit(event)}><Field name="title" label="Название" required defaultValue={topic.title} /><Field name="slug" label="Slug" defaultValue={topic.slug} /><Field name="description" label="Описание" defaultValue={topic.description} /><Field name="parentTopicId" label="ID родительской темы" defaultValue={topic.parentTopicId ?? ""} /><Field name="orderIndex" label="Порядок" type="number" defaultValue={topic.orderIndex} /><Select name="difficulty" label="Сложность" defaultValue={topic.difficulty} values={["intro", "basic", "medium", "hard", "advanced"]} /><button className="button">Сохранить</button></form> : <ReadOnly fields={[["Название", topic.title], ["Slug", topic.slug], ["Описание", topic.description], ["Курс", topic.courseId ?? "Без курса"]]} />)}<section><h2>Пререквизиты</h2>{isAdmin && <form className="inline-form" onSubmit={(event) => { event.preventDefault(); const prerequisiteTopicId = String(new FormData(event.currentTarget).get("prerequisiteTopicId")); void add({ variables: { input: { topicId: id, prerequisiteTopicId } } }).then(() => refetch()); event.currentTarget.reset(); }}><Field name="prerequisiteTopicId" label="ID темы" required /><button className="button">Добавить</button></form>}{data?.topicPrerequisites.map((item) => <div className="prerequisite" key={item.prerequisiteTopicId}><code>{item.prerequisiteTopicId}</code>{isAdmin && <button onClick={() => void remove({ variables: { input: { topicId: id, prerequisiteTopicId: item.prerequisiteTopicId } } }).then(() => refetch())}>Удалить</button>}</div>)}</section></main>;
}

function ReadOnly({ fields }: { fields: Array<[string, string | number | null | undefined]> }) {
  return <dl className="catalog-readonly">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>;
}

function Denied() {
  return <main className="page-shell panel catalog"><ErrorMessage message="Ошибка" /></main>;
}

function RelationSelect({ name, label, items, emptyLabel = "Не привязывать" }: { name: string; label: string; items: Array<{ id: string; name: string }>; emptyLabel?: string }) {
  return <label className="field"><span>{label}</span><select name={name}><option value="">{emptyLabel}</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}

function Field({ label, ...props }: { label: string; name: string; required?: boolean; type?: string; defaultValue?: string | number }) {
  return <label className="field"><span>{label}</span><input {...props} /></label>;
}

function Select({ label, values, ...props }: { label: string; name: string; values: readonly string[]; defaultValue?: string }) {
  return <label className="field"><span>{label}</span><select {...props}>{values.map((value) => <option key={value}>{value}</option>)}</select></label>;
}

function InlineCreate({ onSubmit, label }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; label: string }) {
  return <form className="inline-form" onSubmit={onSubmit}><Field name="name" label={label} required /><button className="button">Создать</button></form>;
}

function createFromForm(event: FormEvent<HTMLFormElement>, callback: (input: { name: string }) => Promise<unknown>) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = String(new FormData(form).get("name") ?? "").trim();
  if (!name) return;
  void callback({ name }).then(() => form.reset());
}

function formString(value: FormDataEntryValue | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalID(value: FormDataEntryValue | undefined) {
  const result = formString(value);

  return result || null;
}

function optionalNumber(value: FormDataEntryValue | undefined) {
  const result = formString(value);
  if (!result) {
    return null;
  }

  return Number(result);
}

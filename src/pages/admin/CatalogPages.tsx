import { useMutation, useQuery } from "@apollo/client";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ADD_PREREQUISITE,
  CHANGE_STATUS,
  COURSE_QUERY,
  COURSES_QUERY,
  CREATE_COURSE,
  CREATE_PROGRAM,
  CREATE_TOPIC,
  CREATE_UNIVERSITY,
  DELETE_ENTITY,
  PROGRAM_QUERY,
  PROGRAMS_QUERY,
  REMOVE_PREREQUISITE,
  TOPIC_QUERY,
  TOPICS_QUERY,
  UNIVERSITIES_QUERY,
  UNIVERSITY_QUERY,
  UPDATE_COURSE,
  UPDATE_PROGRAM,
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
const degreeLevels = ["other", "bachelor", "master", "specialist", "phd"];
const topicDifficulties = ["basic", "intro", "medium", "hard", "advanced"];

function CatalogHeader({ title, back }: { title: string; back?: string }) {
  return (
    <div className="catalog-heading">
      <div>
        {back && <Link to={back}>← Назад</Link>}
        <h1>{title}</h1>
      </div>
    </div>
  );
}

function Actions({
  kind,
  id,
  status,
  refetch,
}: {
  kind: keyof typeof DELETE_ENTITY;
  id: string;
  status: CatalogStatus;
  refetch: () => Promise<unknown>;
}) {
  const { isAdmin } = useAuth();
  const [remove, removeState] = useMutation(DELETE_ENTITY[kind]);
  const [changeStatus, statusState] = useMutation(CHANGE_STATUS[kind]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="catalog-actions">
      <select
        aria-label="Статус"
        value={status}
        onChange={(event) =>
          void changeStatus({ variables: { id, status: event.target.value } }).then(refetch)
        }
      >
        {statuses.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
      <button
        className="button button--danger"
        disabled={removeState.loading}
        onClick={() => {
          if (window.confirm("Удалить объект?")) {
            void remove({ variables: { id } }).then(refetch);
          }
        }}
      >
        Удалить
      </button>
      {(removeState.error || statusState.error) && (
        <ErrorMessage message={(removeState.error ?? statusState.error)?.message ?? "Ошибка"} />
      )}
    </div>
  );
}

export function UniversitiesPage() {
  const { isAdmin } = useAuth();
  const { data, loading, error, refetch } = useQuery<{ universities: University[] }>(
    UNIVERSITIES_QUERY,
  );

  if (loading) return <Spinner />;

  return (
    <main className="page-shell panel catalog">
      <CatalogHeader title="Университеты" />
      {isAdmin && (
        <div className="catalog-actions">
          <Link className="button" to="/admin/catalog/universities/new">
            Добавить университет
          </Link>
          <Link className="button" to="/admin/catalog/programs/new">
            Добавить программу
          </Link>
          <Link className="button" to="/admin/catalog/courses/new">
            Добавить курс
          </Link>
          <Link className="button" to="/admin/catalog/topics/new">
            Добавить тему
          </Link>
        </div>
      )}
      <Link to="/admin/catalog/programs">Backlog программ →</Link>
      {error && <ErrorMessage message={error.message} />}
      <div className="catalog-list">
        {data?.universities.map((item) => (
          <article key={item.id} className="catalog-row">
            <div>
              <Link to={`/admin/catalog/universities/${item.id}`}>
                <strong>{item.name}</strong>
              </Link>
              <p>{[item.shortName, item.city, item.country].filter(Boolean).join(" · ")}</p>
              <Link to={`/admin/catalog/universities/${item.id}/programs`}>Программы →</Link>
            </div>
            <Actions kind="university" id={item.id} status={item.status} refetch={refetch} />
          </article>
        ))}
      </div>
    </main>
  );
}

export function UniversityFormPage({ create = false }: { create?: boolean }) {
  const { id = "" } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const query = useQuery<{ university: University }>(UNIVERSITY_QUERY, {
    variables: { id },
    skip: create,
  });
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
      logoFileId: optionalID(values.logoFileId),
    };
    if (create) {
      await createItem({ variables: { input: { ...input, status: formString(values.status) || "draft" } } });
    } else {
      await updateItem({ variables: { id, input } });
    }
    navigate("/admin/catalog/universities");
  };

  if (!create && query.loading) return <Spinner />;
  if (!isAdmin) return <Denied message="Редактирование доступно только администраторам." />;

  return (
    <main className="page-shell panel catalog">
      <CatalogHeader
        title={create ? "Новый университет" : "Редактирование университета"}
        back="/admin/catalog/universities"
      />
      {error && <ErrorMessage message={error.message} />}
      <form className="form catalog-form" onSubmit={(event) => void submit(event)}>
        <Field name="name" label="Название" required defaultValue={item?.name} />
        <Field name="shortName" label="Краткое название" defaultValue={item?.shortName} />
        <Field name="city" label="Город" defaultValue={item?.city} />
        <Field name="country" label="Страна" defaultValue={item?.country} />
        <Field name="websiteUrl" label="Сайт" type="url" defaultValue={item?.websiteUrl} />
        <Field name="logoFileId" label="ID логотипа media" defaultValue={item?.logoFileId ?? ""} />
        {create && <Select name="status" label="Статус" values={statuses} />}
        <button className="button" disabled={createState.loading || updateState.loading}>
          {create ? "Создать" : "Сохранить"}
        </button>
      </form>
    </main>
  );
}

export function ProgramsPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const parentId = id || null;
  const { data, loading, error, refetch } = useQuery<{ programs: Program[] }>(PROGRAMS_QUERY, {
    variables: { parentId },
  });
  const [createItem, state] = useMutation(CREATE_PROGRAM);
  const submit = (event: FormEvent<HTMLFormElement>) =>
    createFromForm(event, (input) =>
      createItem({
        variables: { input: { universityId: parentId, ...input, degreeLevel: "other" } },
      }).then(() => refetch()),
    );

  if (loading) return <Spinner />;

  return (
    <main className="page-shell panel catalog">
      <CatalogHeader title={parentId ? "Программы университета" : "Backlog программ"} back="/admin/catalog/universities" />
      {(error || state.error) && <ErrorMessage message={(error ?? state.error)?.message ?? "Ошибка"} />}
      {isAdmin && (
        <>
          <Link className="button" to="/admin/catalog/programs/new">
            Добавить программу
          </Link>
          <InlineCreate onSubmit={submit} label="Быстро: название программы" />
        </>
      )}
      {data?.programs.map((item) => (
        <article className="catalog-row" key={item.id}>
          <div>
            <Link to={`/admin/catalog/programs/${item.id}`}>
              <strong>{item.name}</strong>
            </Link>
            <p>{item.faculty || "Факультет не указан"}{!item.universityId && " · без университета"}</p>
            <Link to={`/admin/catalog/programs/${item.id}/courses`}>Курсы →</Link>
          </div>
          <Actions kind="program" id={item.id} status={item.status} refetch={refetch} />
        </article>
      ))}
    </main>
  );
}

export function ProgramFormPage({ create = false }: { create?: boolean }) {
  const { id = "" } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const program = useQuery<{ program: Program }>(PROGRAM_QUERY, {
    variables: { id },
    skip: create,
  });
  const universities = useQuery<{ universities: University[] }>(UNIVERSITIES_QUERY);
  const [createItem, createState] = useMutation(CREATE_PROGRAM);
  const [updateItem, updateState] = useMutation(UPDATE_PROGRAM);
  const item = program.data?.program;
  const error = program.error ?? universities.error ?? createState.error ?? updateState.error;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const universityId = optionalID(values.universityId);
    const input = {
      universityId,
      name: formString(values.name),
      shortName: formString(values.shortName),
      faculty: formString(values.faculty),
      degreeLevel: formString(values.degreeLevel) || "other",
      startYear: optionalNumber(values.startYear),
    };
    if (create) {
      await createItem({ variables: { input: { ...input, status: formString(values.status) || "draft" } } });
    } else {
      await updateItem({ variables: { id, input: { ...input, clearUniversity: !universityId } } });
    }
    navigate("/admin/catalog/programs");
  };

  if (!isAdmin) return <Denied message="Редактирование доступно только администраторам." />;
  if ((!create && program.loading) || universities.loading) return <Spinner />;

  return (
    <main className="page-shell panel catalog">
      <CatalogHeader title={create ? "Новая программа" : "Редактирование программы"} back="/admin/catalog/programs" />
      {error && <ErrorMessage message={error.message} />}
      <form className="form catalog-form" onSubmit={(event) => void submit(event)}>
        <Field name="name" label="Название" required defaultValue={item?.name} />
        <RelationSelect
          name="universityId"
          label="Университет"
          items={(universities.data?.universities ?? []).map((university) => ({
            id: university.id,
            label: university.name,
          }))}
          defaultValue={item?.universityId ?? ""}
          emptyLabel="Без университета"
        />
        <Field name="shortName" label="Краткое название" defaultValue={item?.shortName} />
        <Field name="faculty" label="Факультет" defaultValue={item?.faculty} />
        <Select name="degreeLevel" label="Уровень" values={degreeLevels} defaultValue={item?.degreeLevel ?? "other"} />
        <Field name="startYear" label="Год старта" type="number" defaultValue={item?.startYear ?? ""} />
        {create && <Select name="status" label="Статус" values={statuses} />}
        <button className="button" disabled={createState.loading || updateState.loading}>
          {create ? "Создать" : "Сохранить"}
        </button>
      </form>
    </main>
  );
}

export function CoursesPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const parentId = id || null;
  const { data, loading, error, refetch } = useQuery<{ courses: Course[] }>(COURSES_QUERY, {
    variables: { parentId },
  });
  const [createItem, state] = useMutation(CREATE_COURSE);
  const submit = (event: FormEvent<HTMLFormElement>) =>
    createFromForm(event, (input) =>
      createItem({ variables: { input: { programId: parentId, ...input } } }).then(() => refetch()),
    );

  if (loading) return <Spinner />;

  return (
    <main className="page-shell panel catalog">
      <CatalogHeader title={parentId ? "Курсы программы" : "Backlog курсов"} back="/admin/catalog/universities" />
      {(error || state.error) && <ErrorMessage message={(error ?? state.error)?.message ?? "Ошибка"} />}
      {isAdmin && (
        <>
          <Link className="button" to="/admin/catalog/courses/new">
            Добавить курс
          </Link>
          <InlineCreate onSubmit={submit} label="Быстро: название курса" />
        </>
      )}
      {data?.courses.map((item) => (
        <article className="catalog-row" key={item.id}>
          <div>
            <Link to={`/admin/catalog/courses/${item.id}`}>
              <strong>{item.name}</strong>
            </Link>
            <p>{item.slug}{!item.programId && " · без программы"}</p>
            <Link to={`/admin/catalog/courses/${item.id}/topics`}>Темы →</Link>
          </div>
          <Actions kind="course" id={item.id} status={item.status} refetch={refetch} />
        </article>
      ))}
    </main>
  );
}

export function CourseFormPage({ create = false }: { create?: boolean }) {
  const { id = "" } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const course = useQuery<{ course: Course }>(COURSE_QUERY, {
    variables: { id },
    skip: create,
  });
  const universities = useQuery<{ universities: University[] }>(UNIVERSITIES_QUERY);
  const programs = useQuery<{ programs: Program[] }>(PROGRAMS_QUERY, { variables: { parentId: null } });
  const [createItem, createState] = useMutation(CREATE_COURSE);
  const [updateItem, updateState] = useMutation(UPDATE_COURSE);
  const item = course.data?.course;
  const [universityID, setUniversityID] = useState("");
  const [programID, setProgramID] = useState("");

  useEffect(() => {
    if (!item || programID) return;
    const nextProgramID = item.programId ?? "";
    setProgramID(nextProgramID);
    setUniversityID(universityIDForProgram(nextProgramID, programs.data?.programs ?? []));
  }, [item, programID, programs.data?.programs]);

  const filteredPrograms = (programs.data?.programs ?? []).filter(
    (programItem) => !universityID || programItem.universityId === universityID,
  );
  const error = course.error ?? universities.error ?? programs.error ?? createState.error ?? updateState.error;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const selectedProgramID = optionalID(values.programId);
    const input = {
      programId: selectedProgramID,
      name: formString(values.name),
      slug: formString(values.slug),
      description: formString(values.description),
      semester: optionalNumber(values.semester),
      yearNumber: optionalNumber(values.yearNumber),
    };
    if (create) {
      await createItem({ variables: { input: { ...input, status: formString(values.status) || "draft" } } });
    } else {
      await updateItem({ variables: { id, input: { ...input, clearProgram: !selectedProgramID } } });
    }
    navigate("/admin/catalog/courses");
  };

  if (!isAdmin) return <Denied message="Редактирование доступно только администраторам." />;
  if ((!create && course.loading) || universities.loading || programs.loading) return <Spinner />;

  return (
    <main className="page-shell panel catalog">
      <CatalogHeader title={create ? "Новый курс" : "Редактирование курса"} back="/admin/catalog/courses" />
      {error && <ErrorMessage message={error.message} />}
      <form className="form catalog-form" onSubmit={(event) => void submit(event)}>
        <Field name="name" label="Название" required defaultValue={item?.name} />
        <label className="field">
          <span>Университет</span>
          <select
            name="universityId"
            value={universityID}
            onChange={(event) => {
              setUniversityID(event.target.value);
              setProgramID("");
            }}
          >
            <option value="">Без фильтра</option>
            {universities.data?.universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
              </option>
            ))}
          </select>
        </label>
        <RelationSelect
          name="programId"
          label="Программа"
          items={filteredPrograms.map((programItem) => ({
            id: programItem.id,
            label: programLabel(programItem, universities.data?.universities ?? []),
          }))}
          value={programID}
          onChange={setProgramID}
          emptyLabel="Без программы"
        />
        <Field name="slug" label="Slug" defaultValue={item?.slug} />
        <Field name="description" label="Описание" defaultValue={item?.description} />
        <Field name="semester" label="Семестр" type="number" defaultValue={item?.semester ?? ""} />
        <Field name="yearNumber" label="Год обучения" type="number" defaultValue={item?.yearNumber ?? ""} />
        {create && <Select name="status" label="Статус" values={statuses} />}
        <button className="button" disabled={createState.loading || updateState.loading}>
          {create ? "Создать" : "Сохранить"}
        </button>
      </form>
    </main>
  );
}

export function TopicsPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const parentId = id || null;
  const { data, loading, error, refetch } = useQuery<{
    topics: Topic[];
    topicTree: Array<{ topic: Topic; children: Array<{ topic: Topic }> }>;
  }>(TOPICS_QUERY, { variables: { parentId } });
  const [createItem, state] = useMutation(CREATE_TOPIC);
  const submit = (event: FormEvent<HTMLFormElement>) =>
    createFromForm(event, (input) =>
      createItem({ variables: { input: { courseId: parentId, ...input } } }).then(() => refetch()),
    );

  if (loading) return <Spinner />;

  return (
    <main className="page-shell panel catalog">
      <CatalogHeader title={parentId ? "Темы курса" : "Backlog тем"} back="/admin/catalog/universities" />
      {(error || state.error) && <ErrorMessage message={(error ?? state.error)?.message ?? "Ошибка"} />}
      {isAdmin && (
        <>
          <Link className="button" to="/admin/catalog/topics/new">
            Добавить тему
          </Link>
          <InlineCreate onSubmit={submit} label="Быстро: название темы" />
        </>
      )}
      <section>
        <h2>Иерархия</h2>
        <ul className="topic-tree">
          {data?.topicTree.map((node) => (
            <li key={node.topic.id}>
              <Link to={`/admin/catalog/topics/${node.topic.id}`}>{node.topic.title}</Link>
              {node.children.length > 0 && (
                <ul>
                  {node.children.map((child) => (
                    <li key={child.topic.id}>
                      <Link to={`/admin/catalog/topics/${child.topic.id}`}>{child.topic.title}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>
      {data?.topics.map((item) => (
        <article className="catalog-row" key={item.id}>
          <Link to={`/admin/catalog/topics/${item.id}`}>
            <strong>{item.title}</strong>
            <p>{item.slug}{!item.courseId && " · без курса"}</p>
          </Link>
          <Actions kind="topic" id={item.id} status={item.status} refetch={refetch} />
        </article>
      ))}
    </main>
  );
}

export function TopicFormPage({ create = false }: { create?: boolean }) {
  const { id = "" } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const topic = useQuery<{ topic: Topic; topicPrerequisites: Array<{ prerequisiteTopicId: string }> }>(
    TOPIC_QUERY,
    {
      variables: { id },
      skip: create,
    },
  );
  const universities = useQuery<{ universities: University[] }>(UNIVERSITIES_QUERY);
  const programs = useQuery<{ programs: Program[] }>(PROGRAMS_QUERY, { variables: { parentId: null } });
  const courses = useQuery<{ courses: Course[] }>(COURSES_QUERY, { variables: { parentId: null } });
  const topics = useQuery<{ topics: Topic[] }>(TOPICS_QUERY, { variables: { parentId: null } });
  const [createItem, createState] = useMutation(CREATE_TOPIC);
  const [updateItem, updateState] = useMutation(UPDATE_TOPIC);
  const [add, addState] = useMutation(ADD_PREREQUISITE);
  const [remove, removeState] = useMutation(REMOVE_PREREQUISITE);
  const item = topic.data?.topic;
  const [universityID, setUniversityID] = useState("");
  const [programID, setProgramID] = useState("");
  const [courseID, setCourseID] = useState("");
  const [parentTopicID, setParentTopicID] = useState("");

  useEffect(() => {
    if (!item || courseID) return;
    const nextCourseID = item.courseId ?? "";
    const nextProgramID = programIDForCourse(nextCourseID, courses.data?.courses ?? []);
    setCourseID(nextCourseID);
    setProgramID(nextProgramID);
    setUniversityID(universityIDForProgram(nextProgramID, programs.data?.programs ?? []));
    setParentTopicID(item.parentTopicId ?? "");
  }, [courseID, courses.data?.courses, item, programs.data?.programs]);

  const filteredPrograms = (programs.data?.programs ?? []).filter(
    (programItem) => !universityID || programItem.universityId === universityID,
  );
  const filteredCourses = (courses.data?.courses ?? []).filter(
    (courseItem) => !programID || courseItem.programId === programID,
  );
  const parentTopics = (topics.data?.topics ?? []).filter(
    (topicItem) => topicItem.id !== id && sameOptionalValue(topicItem.courseId, courseID),
  );
  const error =
    topic.error ??
    universities.error ??
    programs.error ??
    courses.error ??
    topics.error ??
    createState.error ??
    updateState.error ??
    addState.error ??
    removeState.error;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const selectedCourseID = optionalID(values.courseId);
    const selectedParentTopicID = optionalID(values.parentTopicId);
    const input = {
      courseId: selectedCourseID,
      parentTopicId: selectedParentTopicID,
      title: formString(values.title),
      slug: formString(values.slug),
      description: formString(values.description),
      orderIndex: optionalNumber(values.orderIndex) ?? 0,
      difficulty: formString(values.difficulty) || "basic",
    };
    if (create) {
      await createItem({ variables: { input: { ...input, status: formString(values.status) || "draft" } } });
      navigate("/admin/catalog/topics");
      return;
    }
    await updateItem({
      variables: {
        id,
        input: {
          ...input,
          clearCourse: !selectedCourseID,
          clearParentTopic: !selectedParentTopicID,
        },
      },
    });
    await topic.refetch();
  };

  if (!isAdmin) return <Denied message="Редактирование доступно только администраторам." />;
  if (
    (!create && topic.loading) ||
    universities.loading ||
    programs.loading ||
    courses.loading ||
    topics.loading
  ) {
    return <Spinner />;
  }

  return (
    <main className="page-shell panel catalog">
      <CatalogHeader title={create ? "Новая тема" : "Редактирование темы"} back="/admin/catalog/topics" />
      {error && <ErrorMessage message={error.message} />}
      <form className="form catalog-form" onSubmit={(event) => void submit(event)}>
        <Field name="title" label="Название" required defaultValue={item?.title} />
        <label className="field">
          <span>Университет</span>
          <select
            name="universityId"
            value={universityID}
            onChange={(event) => {
              setUniversityID(event.target.value);
              setProgramID("");
              setCourseID("");
              setParentTopicID("");
            }}
          >
            <option value="">Без фильтра</option>
            {universities.data?.universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
              </option>
            ))}
          </select>
        </label>
        <RelationSelect
          name="programId"
          label="Программа"
          items={filteredPrograms.map((programItem) => ({
            id: programItem.id,
            label: programLabel(programItem, universities.data?.universities ?? []),
          }))}
          value={programID}
          onChange={(value) => {
            setProgramID(value);
            setCourseID("");
            setParentTopicID("");
          }}
          emptyLabel="Без фильтра"
        />
        <RelationSelect
          name="courseId"
          label="Курс"
          items={filteredCourses.map((courseItem) => ({
            id: courseItem.id,
            label: courseLabel(courseItem, programs.data?.programs ?? []),
          }))}
          value={courseID}
          onChange={(value) => {
            setCourseID(value);
            setParentTopicID("");
          }}
          emptyLabel="Без курса"
        />
        <RelationSelect
          name="parentTopicId"
          label="Родительская тема"
          items={parentTopics.map((topicItem) => ({ id: topicItem.id, label: topicItem.title }))}
          value={parentTopicID}
          onChange={setParentTopicID}
          emptyLabel="Без родительской темы"
        />
        <Field name="slug" label="Slug" defaultValue={item?.slug} />
        <Field name="description" label="Описание" defaultValue={item?.description} />
        <Field name="orderIndex" label="Порядок" type="number" defaultValue={item?.orderIndex ?? 0} />
        <Select name="difficulty" label="Сложность" values={topicDifficulties} defaultValue={item?.difficulty ?? "basic"} />
        {create && <Select name="status" label="Статус" values={statuses} />}
        <button className="button" disabled={createState.loading || updateState.loading}>
          {create ? "Создать" : "Сохранить"}
        </button>
      </form>
      {!create && (
        <section>
          <h2>Пререквизиты</h2>
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const prerequisiteTopicId = String(new FormData(event.currentTarget).get("prerequisiteTopicId"));
              void add({ variables: { input: { topicId: id, prerequisiteTopicId } } }).then(() => topic.refetch());
              event.currentTarget.reset();
            }}
          >
            <RelationSelect
              name="prerequisiteTopicId"
              label="Тема"
              items={parentTopics.map((topicItem) => ({ id: topicItem.id, label: topicItem.title }))}
              emptyLabel="Выберите тему"
            />
            <button className="button">Добавить</button>
          </form>
          {topic.data?.topicPrerequisites.map((prerequisite) => (
            <div className="prerequisite" key={prerequisite.prerequisiteTopicId}>
              <code>{topicTitle(prerequisite.prerequisiteTopicId, topics.data?.topics ?? [])}</code>
              <button
                onClick={() =>
                  void remove({
                    variables: {
                      input: { topicId: id, prerequisiteTopicId: prerequisite.prerequisiteTopicId },
                    },
                  }).then(() => topic.refetch())
                }
              >
                Удалить
              </button>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

function Denied({ message = "Ошибка" }: { message?: string }) {
  return (
    <main className="page-shell panel catalog">
      <ErrorMessage message={message} />
    </main>
  );
}

function RelationSelect({
  name,
  label,
  items,
  emptyLabel = "Не привязывать",
  defaultValue,
  value,
  onChange,
}: {
  name: string;
  label: string;
  items: Array<{ id: string; label: string }>;
  emptyLabel?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const initialID = value ?? defaultValue ?? "";
  const [internalID, setInternalID] = useState(initialID);
  const selectedID = value === undefined ? internalID : value;
  const selectedItem = items.find((item) => item.id === selectedID);
  const [query, setQuery] = useState(selectedItem?.label ?? "");

  useEffect(() => {
    const match = items.find((item) => item.id === selectedID);
    if (match) setQuery(match.label);
    else if (!selectedID) setQuery("");
  }, [items, selectedID]);

  const setSelected = (nextID: string) => {
    if (onChange) onChange(nextID);
    else setInternalID(nextID);
  };
  const createPath = label.includes("Университет") ? "/admin/catalog/universities/new" : label.includes("Программ") ? "/admin/catalog/programs/new" : label.includes("Курс") ? "/admin/catalog/courses/new" : label.includes("тем") || label.includes("Тем") ? "/admin/catalog/topics/new" : "";

  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} type="hidden" value={selectedID} />
      <input list={`${name}-suggestions`} onChange={(event) => { const nextQuery = event.target.value; setQuery(nextQuery); const match = items.find((item) => item.label === nextQuery); setSelected(match?.id ?? ""); }} placeholder={emptyLabel} value={query} />
      <datalist id={`${name}-suggestions`}>{items.map((item) => <option key={item.id} value={item.label} />)}</datalist>
      {query.trim() && !items.some((item) => item.label.toLocaleLowerCase("ru") === query.trim().toLocaleLowerCase("ru")) && createPath && <small>Совпадений нет. <Link className="text-link" to={createPath}>Создать новый элемент</Link></small>}
    </label>
  );
}

function Field({
  label,
  defaultValue,
  ...props
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  defaultValue?: string | number | null;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} defaultValue={defaultValue ?? ""} />
    </label>
  );
}

function Select({
  label,
  values,
  ...props
}: {
  label: string;
  name: string;
  values: readonly string[];
  defaultValue?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select {...props}>
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}

function InlineCreate({
  onSubmit,
  label,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  label: string;
}) {
  return (
    <form className="inline-form" onSubmit={onSubmit}>
      <Field name="name" label={label} required />
      <button className="button">Создать</button>
    </form>
  );
}

function createFromForm(event: FormEvent<HTMLFormElement>, callback: (input: { name: string }) => Promise<unknown>) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = String(new FormData(form).get("name") ?? "").trim();
  if (!name) return;
  void callback({ name }).then(() => form.reset());
}

function formString(value: FormDataEntryValue | undefined | null) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalID(value: FormDataEntryValue | undefined | null) {
  const result = formString(value);

  return result || null;
}

function optionalNumber(value: FormDataEntryValue | undefined | null) {
  const result = formString(value);
  if (!result) {
    return null;
  }

  return Number(result);
}

function universityIDForProgram(programID: string, programs: Program[]) {
  return programs.find((program) => program.id === programID)?.universityId ?? "";
}

function programIDForCourse(courseID: string, courses: Course[]) {
  return courses.find((course) => course.id === courseID)?.programId ?? "";
}

function programLabel(program: Program, universities: University[]) {
  const university = universities.find((item) => item.id === program.universityId);

  return `${program.name} · ${university?.name ?? "без университета"}`;
}

function courseLabel(course: Course, programs: Program[]) {
  const program = programs.find((item) => item.id === course.programId);

  return `${course.name} · ${program?.name ?? "без программы"}`;
}

function topicTitle(topicID: string, topics: Topic[]) {
  const topic = topics.find((item) => item.id === topicID);

  return topic ? topic.title : topicID;
}

function sameOptionalValue(left: string | null | undefined, right: string) {
  return (left ?? "") === right;
}

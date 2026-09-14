import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Checkbox,
  Column,
  Dropdown,
  Grid,
  InlineLoading,
  InlineNotification,
  Modal,
  MultiSelect,
  Search,
  TextInput,
  Tile,
} from "@carbon/react";
import { ArrowUp, ArrowDown, Close, Download } from "@carbon/icons-react";
import { useIntl } from "react-intl";
import UserSessionDetailsContext from "../../../UserSessionDetailsContext";
import PageBreadCrumb from "../../common/PageBreadCrumb";
import { serverQuery } from "../../utils/queryClient";
import {
  createSavedReport,
  deleteSavedReport,
  downloadUrl,
  reportingPath,
  submitReport,
  updateSavedReport,
} from "./api";
import "./CustomDataExport.scss";

// Reports links can reload the page. Keep only the draft in this browser session.
const draftStorageKey = "openelis-reporting-draft";
let sessionDraft;
export const clearReportingDraft = () => {
  sessionDraft = undefined;
  try {
    window.sessionStorage.removeItem(draftStorageKey);
  } catch {
    /* In-memory drafts still work when browser storage is unavailable. */
  }
};
const emptyDraft = () => ({
  reportType: "SAMPLE_TESTING",
  layout: "SPREADSHEET",
  columns: {},
  dateFrom: "",
  dateTo: "",
  labSectionIds: [],
  testIds: [],
  resultStatuses: ["FINALIZED"],
  jobId: null,
  review: false,
  savedReport: null,
});
function readDraft(owner) {
  if (!owner) return emptyDraft();
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(draftStorageKey));
    if (
      stored?.version === 1 &&
      stored.draft?.columns &&
      Array.isArray(stored.draft.labSectionIds) &&
      Array.isArray(stored.draft.testIds) &&
      Array.isArray(stored.draft.resultStatuses)
    )
      sessionDraft = stored;
  } catch {
    /* Use the current page's draft if storage cannot be read. */
  }
  if (sessionDraft?.owner === owner) return sessionDraft.draft;
  clearReportingDraft();
  return emptyDraft();
}
function saveDraft(owner, draft) {
  if (!owner) return;
  sessionDraft = { version: 1, owner, draft };
  try {
    window.sessionStorage.setItem(
      draftStorageKey,
      JSON.stringify(sessionDraft),
    );
  } catch {
    /* Navigation within the page remains available without browser storage. */
  }
}
const calendarDay = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const day = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(day) &&
    new Date(day).toISOString().slice(0, 10) === value
    ? day
    : NaN;
};
const active = (job) => job && ["QUEUED", "GENERATING"].includes(job.state);

export default function CustomDataExport() {
  const { userSessionDetails = {} } = useContext(UserSessionDetailsContext);
  const owner = String(
    userSessionDetails.userId || userSessionDetails.loginName || "",
  );
  return <ReportingBuilder key={owner} owner={owner} />;
}

function ReportingBuilder({ owner }) {
  const intl = useIntl();
  const t = (id, values) => intl.formatMessage({ id }, values);
  const [draft, setDraft] = useState(() => readDraft(owner));
  const review = draft.review;
  const [datesTouched, setDatesTouched] = useState({ from: false, to: false });
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState("builder");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savedSearch, setSavedSearch] = useState("");
  const [savedNotice, setSavedNotice] = useState("");
  const [freshDatePrompt, setFreshDatePrompt] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [positionMessage, setPositionMessage] = useState("");
  const [queuePage, setQueuePage] = useState(0);
  const submitted = useRef(null);
  const dragged = useRef(null);
  const queryClient = useQueryClient();
  const columnKey = `${draft.reportType}:${draft.layout}`;
  const types = useQuery(
    serverQuery(["reporting-types", owner], `${reportingPath}/report-types`),
  );
  const catalog = useQuery({
    ...serverQuery(
      ["reporting-catalog", owner, draft.reportType, draft.layout],
      `${reportingPath}/variables?reportType=${encodeURIComponent(draft.reportType)}&layout=${encodeURIComponent(draft.layout)}`,
    ),
    enabled: !!draft.reportType,
  });
  const job = useQuery({
    ...serverQuery(
      ["reporting-job", owner, draft.jobId],
      `${reportingPath}/jobs/${draft.jobId}`,
    ),
    enabled: !!draft.jobId,
    refetchInterval: (data) => (active(data) ? 1500 : false),
  });
  const queue = useQuery({
    ...serverQuery(
      ["reporting-queue", owner, queuePage],
      `${reportingPath}/jobs?page=${queuePage}`,
    ),
    enabled: panel === "queue",
    refetchInterval: (data) => (data?.activeCount > 0 ? 2000 : false),
  });
  const savedReports = useQuery({
    ...serverQuery(
      ["reporting-saved", owner, savedSearch],
      `${reportingPath}/saved-configs?page=0&size=100&search=${encodeURIComponent(savedSearch)}`,
    ),
    enabled: panel === "saved",
  });
  const submission = useMutation({
    mutationFn: submitReport,
    onSuccess: (result) => {
      queryClient.setQueryData(["reporting-job", owner, result.id], result);
      setDraft((value) => ({ ...value, jobId: result.id }));
      queryClient.invalidateQueries({ queryKey: ["reporting-queue", owner] });
    },
  });
  const savedDefinition = () => ({
    schemaVersion: 1,
    reportType: draft.reportType,
    layout: draft.layout,
    selectedVariables: selected,
    filters: {
      labSectionIds: draft.labSectionIds,
      testIds: draft.testIds,
      resultStatuses: draft.resultStatuses,
    },
  });
  const createSaved = useMutation({
    mutationFn: createSavedReport,
    onSuccess: (result) => {
      setDraft((value) => ({ ...value, savedReport: result }));
      setSavedNotice(t("reporting.saved.created", { name: result.name }));
      setSaveOpen(false);
      queryClient.invalidateQueries({ queryKey: ["reporting-saved", owner] });
    },
  });
  const updateSaved = useMutation({
    mutationFn: updateSavedReport,
    onSuccess: (result) => {
      setDraft((value) => ({ ...value, savedReport: result }));
      setSavedNotice(t("reporting.saved.updated", { name: result.name }));
      setUpdateOpen(false);
      queryClient.setQueriesData(
        { queryKey: ["reporting-saved", owner] },
        (page) =>
          page?.reports
            ? {
                ...page,
                reports: page.reports.map((saved) =>
                  saved.id === result.id ? result : saved,
                ),
              }
            : page,
      );
      queryClient.invalidateQueries({ queryKey: ["reporting-saved", owner] });
    },
  });
  const removeSaved = useMutation({
    mutationFn: deleteSavedReport,
    onSuccess: () => {
      const removedId = deleteCandidate?.id;
      if (draft.savedReport?.id === removedId)
        setDraft((value) => ({ ...value, savedReport: null }));
      setDeleteCandidate(null);
      queryClient.setQueriesData(
        { queryKey: ["reporting-saved", owner] },
        (page) =>
          page?.reports
            ? {
                ...page,
                reports: page.reports.filter(
                  (saved) => saved.id !== removedId,
                ),
              }
            : page,
      );
      queryClient.invalidateQueries({ queryKey: ["reporting-saved", owner] });
    },
  });

  useEffect(() => {
    saveDraft(owner, draft);
  }, [owner, draft]);
  useEffect(() => {
    if (catalog.data && !draft.columns[columnKey])
      setDraft((value) => ({
        ...value,
        columns: { ...value.columns, [columnKey]: catalog.data.defaultColumns },
      }));
  }, [catalog.data, columnKey, draft.columns]);

  const fields = catalog.data?.variables || [];
  const byId = useMemo(
    () => new Map(fields.map((field) => [field.id, field])),
    [catalog.data],
  );
  const selected = draft.columns[columnKey] || [];
  const stale = selected.filter((id) => !byId.has(id));
  const firstDay = calendarDay(draft.dateFrom);
  const lastDay = calendarDay(draft.dateTo);
  const periodDays = (lastDay - firstDay) / 86400000 + 1;
  const fromError = !draft.dateFrom
    ? datesTouched.from
      ? "reporting.dates.requiredFrom"
      : null
    : !Number.isFinite(firstDay)
      ? "reporting.dates.invalid"
      : null;
  const toError = !draft.dateTo
    ? datesTouched.to
      ? "reporting.dates.requiredTo"
      : null
    : !Number.isFinite(lastDay)
      ? "reporting.dates.invalid"
      : periodDays < 1
        ? "reporting.dates.reversed"
        : periodDays > catalog.data?.maxDays
          ? "reporting.dates.tooLong"
          : null;
  const validPeriod =
    Number.isFinite(periodDays) &&
    periodDays >= 1 &&
    periodDays <= catalog.data?.maxDays;
  const groups = useMemo(() => {
    const result = new Map();
    fields
      .filter((field) =>
        field.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      )
      .forEach((field) => {
        if (!result.has(field.group)) result.set(field.group, []);
        result.get(field.group).push(field);
      });
    return Array.from(result.entries());
  }, [catalog.data, search]);
  const update = (changes) => {
    setDraft((value) => ({ ...value, ...changes }));
    submission.reset();
  };
  const openSaved = (saved, copy = false) => {
    const definition = saved.definition;
    const key = `${definition.reportType}:${definition.layout}`;
    setDraft((value) => ({
      ...value,
      reportType: definition.reportType,
      layout: definition.layout,
      columns: {
        ...value.columns,
        [key]: definition.selectedVariables,
      },
      dateFrom: "",
      dateTo: "",
      labSectionIds: definition.filters.labSectionIds,
      testIds: definition.filters.testIds,
      resultStatuses: definition.filters.resultStatuses,
      jobId: null,
      review: false,
      savedReport: copy ? null : saved,
    }));
    setDatesTouched({ from: false, to: false });
    setFreshDatePrompt(true);
    setPanel("builder");
    setSavedNotice("");
    if (copy) {
      setSaveName(t("reporting.saved.copyName", { name: saved.name }));
      setSaveOpen(true);
    }
  };
  const saveCurrent = () => {
    createSaved.mutate({ name: saveName, definition: savedDefinition() });
  };
  const updateCurrent = () => {
    setUpdateOpen(false);
    updateSaved.mutate({
      id: draft.savedReport.id,
      name: draft.savedReport.name,
      expectedVersion: draft.savedReport.version,
      definition: savedDefinition(),
    });
  };
  const setColumns = (columns) =>
    update({ columns: { ...draft.columns, [columnKey]: columns } });
  const move = (id, index) => {
    const next = selected.filter((field) => field !== id);
    next.splice(index, 0, id);
    setColumns(next);
    setPositionMessage(
      t("reporting.position", {
        field: byId.get(id)?.label || id,
        position: index + 1,
        count: next.length,
      }),
    );
  };
  const run = () => {
    const request = {
      schemaVersion: 1,
      reportType: draft.reportType,
      layout: draft.layout,
      selectedVariables: selected,
      filterSpec: {
        dateFrom: draft.dateFrom,
        dateTo: draft.dateTo,
        labSectionIds: draft.labSectionIds,
        testIds: draft.testIds,
        resultStatuses: draft.resultStatuses,
      },
    };
    const fingerprint = JSON.stringify(request);
    if (
      !submitted.current ||
      submitted.current.fingerprint !== fingerprint ||
      job.data?.state === "READY"
    ) {
      submitted.current = { fingerprint, id: crypto.randomUUID() };
    }
    submission.mutate({ ...request, clientRequestId: submitted.current.id });
  };
  const errorText = (error) =>
    intl.messages[error?.message]
      ? t(error.message)
      : t("reporting.requestError");
  const lookup = (items, ids) =>
    ids.length
      ? items
          .filter((item) => ids.includes(item.id))
          .map((item) => item.label)
          .join(", ")
      : t("reporting.all");
  const jobCard = (item) => (
    <Tile key={item.id} className="reporting-job">
      <div>
        <strong>{item.request.definition.label}</strong>
        <p>
          {item.request.filterSpec.dateFrom} – {item.request.filterSpec.dateTo}
        </p>
        <p>
          {t(`reporting.state.${item.state}`)}
          {item.rowCount != null
            ? ` · ${t("reporting.rows", { count: item.rowCount })}`
            : ""}
        </p>
      </div>
      {active(item) && (
        <InlineLoading description={t("reporting.generating")} />
      )}
      {item.state === "READY" && (
        <Button as="a" href={downloadUrl(item.id)} renderIcon={Download}>
          {t("reporting.download")}
        </Button>
      )}
      {item.state === "FAILED" && (
        <p role="alert">{errorText({ message: item.failureCode })}</p>
      )}
    </Tile>
  );

  return (
    <main className="reporting-builder">
      <PageBreadCrumb
        breadcrumbs={[
          { label: "home.label", link: "/" },
          { label: "reporting.title", link: "" },
        ]}
      />
      <div className="reporting-title">
        <div>
          <h1>{t("reporting.title")}</h1>
          <p>{t("reporting.description")}</p>
        </div>
        <div className="reporting-title-actions">
          <Button
            kind="tertiary"
            onClick={() => setPanel(panel === "saved" ? "builder" : "saved")}
          >
            {t(panel === "saved" ? "reporting.builder" : "reporting.saved.library")}
          </Button>
          <Button
            kind="tertiary"
            onClick={() => setPanel(panel === "queue" ? "builder" : "queue")}
          >
            {t(panel === "queue" ? "reporting.builder" : "reporting.queue")}
          </Button>
        </div>
      </div>
      {(types.error || catalog.error) && (
        <InlineNotification
          kind="error"
          title={t("reporting.loadError")}
          subtitle={errorText(types.error || catalog.error)}
          hideCloseButton
        />
      )}
      {panel === "queue" ? (
        <section aria-label={t("reporting.queue")}>
          <h2>{t("reporting.queue")}</h2>
          {queue.isLoading && (
            <InlineLoading description={t("reporting.loading")} />
          )}
          {queue.error && (
            <InlineNotification
              kind="error"
              title={t("reporting.loadError")}
              hideCloseButton
            />
          )}
          {queue.data?.jobs.map(jobCard)}
          {queue.data?.jobs.length === 0 && <p>{t("reporting.queueEmpty")}</p>}
          <div className="reporting-actions">
            <Button
              kind="ghost"
              disabled={!queuePage}
              onClick={() => setQueuePage(queuePage - 1)}
            >
              {t("reporting.previous")}
            </Button>
            <Button
              kind="ghost"
              disabled={!queue.data?.hasMore}
              onClick={() => setQueuePage(queuePage + 1)}
            >
              {t("reporting.next")}
            </Button>
          </div>
        </section>
      ) : panel === "saved" ? (
        <section aria-label={t("reporting.saved.library")}>
          <h2>{t("reporting.saved.library")}</h2>
          <Search
            id="reporting-saved-search"
            labelText={t("reporting.saved.search")}
            placeholder={t("reporting.saved.search")}
            value={savedSearch}
            onChange={(event) => setSavedSearch(event.target.value)}
          />
          {savedReports.isLoading && (
            <InlineLoading description={t("reporting.saved.loading")} />
          )}
          {savedReports.error && (
            <InlineNotification
              kind="error"
              title={t("reporting.saved.loadError")}
              hideCloseButton
            />
          )}
          {savedReports.data?.reports.length === 0 && (
            <p>{t("reporting.saved.empty")}</p>
          )}
          <div className="reporting-saved-list">
            {savedReports.data?.reports.map((saved) => (
              <Tile role="article" aria-label={saved.name} key={saved.id}>
                <div>
                  <h3>{saved.name}</h3>
                  <p>{t("reporting.saved.shared")}</p>
                </div>
                <div className="reporting-actions">
                  <Button size="sm" onClick={() => openSaved(saved)}>
                    {t("reporting.saved.open")}
                  </Button>
                  <Button kind="secondary" size="sm" onClick={() => openSaved(saved, true)}>
                    {t("reporting.saved.copy")}
                  </Button>
                  <Button kind="danger--tertiary" size="sm" onClick={() => setDeleteCandidate(saved)}>
                    {t("reporting.saved.delete")}
                  </Button>
                </div>
              </Tile>
            ))}
          </div>
        </section>
      ) : (
        <>
          {catalog.isLoading && (
            <InlineLoading description={t("reporting.loading")} />
          )}
          {catalog.data && (
            <>
              {savedNotice && (
                <InlineNotification
                  kind="success"
                  title={savedNotice}
                  hideCloseButton
                />
              )}
              {freshDatePrompt && (!draft.dateFrom || !draft.dateTo) && (
                <InlineNotification
                  kind="info"
                  title={t("reporting.saved.freshDates")}
                  hideCloseButton
                />
              )}
              {(createSaved.error || updateSaved.error) && (
                <InlineNotification
                  kind="error"
                  title={errorText(createSaved.error || updateSaved.error)}
                  hideCloseButton
                />
              )}
              {!review ? (
                <>
                  <Grid className="reporting-controls">
                    <Column lg={8} md={4} sm={4}>
                      <Dropdown
                        id="reporting-source"
                        titleText={t("reporting.reportType")}
                        label={t("reporting.reportType")}
                        items={types.data || []}
                        itemToString={(item) => item?.label || ""}
                        selectedItem={
                          types.data?.find(
                            (item) => item.id === draft.reportType,
                          ) || null
                        }
                        onChange={({ selectedItem }) =>
                          update({
                            reportType: selectedItem.id,
                            layout: selectedItem.layouts[0],
                          })
                        }
                      />
                    </Column>
                    <Column lg={8} md={4} sm={4}>
                      <Dropdown
                        id="reporting-layout"
                        titleText={t("reporting.layout")}
                        label={t("reporting.layout")}
                        items={catalog.data.definition.layouts}
                        itemToString={(item) =>
                          item ? t(`reporting.layout.${item}`) : ""
                        }
                        selectedItem={draft.layout}
                        onChange={({ selectedItem }) =>
                          update({ layout: selectedItem })
                        }
                      />
                    </Column>
                    <Column lg={8} md={4} sm={4}>
                      <TextInput
                        id="reporting-from"
                        type="date"
                        labelText={t("reporting.dateFrom")}
                        value={draft.dateFrom}
                        helperText={t("reporting.dates.required")}
                        invalid={!!fromError}
                        invalidText={fromError ? t(fromError) : ""}
                        onBlur={() =>
                          setDatesTouched((value) => ({ ...value, from: true }))
                        }
                        onChange={(event) =>
                          update({ dateFrom: event.target.value })
                        }
                      />
                    </Column>
                    <Column lg={8} md={4} sm={4}>
                      <TextInput
                        id="reporting-to"
                        type="date"
                        labelText={t("reporting.dateTo")}
                        value={draft.dateTo}
                        helperText={t("reporting.dates.required")}
                        invalid={!!toError}
                        invalidText={
                          toError
                            ? t(toError, { days: catalog.data.maxDays })
                            : ""
                        }
                        onBlur={() =>
                          setDatesTouched((value) => ({ ...value, to: true }))
                        }
                        onChange={(event) =>
                          update({ dateTo: event.target.value })
                        }
                      />
                    </Column>
                    <Column lg={8} md={4} sm={4}>
                      <MultiSelect
                        id="reporting-sections"
                        titleText={t("reporting.labSections")}
                        label={t("reporting.allAccessibleSections")}
                        items={catalog.data.labSections}
                        itemToString={(item) => item?.label || ""}
                        selectedItems={catalog.data.labSections.filter((item) =>
                          draft.labSectionIds.includes(item.id),
                        )}
                        onChange={({ selectedItems }) =>
                          update({
                            labSectionIds: selectedItems.map((item) => item.id),
                          })
                        }
                      />
                    </Column>
                    <Column lg={8} md={4} sm={4}>
                      <MultiSelect
                        id="reporting-tests"
                        titleText={t("reporting.tests")}
                        label={t("reporting.allTests")}
                        items={catalog.data.tests}
                        itemToString={(item) => item?.label || ""}
                        selectedItems={catalog.data.tests.filter((item) =>
                          draft.testIds.includes(item.id),
                        )}
                        onChange={({ selectedItems }) =>
                          update({
                            testIds: selectedItems.map((item) => item.id),
                          })
                        }
                      />
                    </Column>
                    <Column lg={8} md={4} sm={4}>
                      <MultiSelect
                        id="reporting-statuses"
                        titleText={t("reporting.resultStatuses")}
                        label={t("reporting.finalized")}
                        items={catalog.data.statuses}
                        itemToString={(item) => item?.label || ""}
                        selectedItems={catalog.data.statuses.filter((item) =>
                          draft.resultStatuses.includes(item.id),
                        )}
                        onChange={({ selectedItems }) =>
                          update({
                            resultStatuses: selectedItems.map(
                              (item) => item.id,
                            ),
                          })
                        }
                      />
                    </Column>
                  </Grid>
                  <p className="reporting-help">
                    {t("reporting.periodHelp", {
                      days: catalog.data.maxDays,
                      timezone: catalog.data.timezone,
                    })}
                  </p>
                  <p className="reporting-help">
                    {t(`reporting.meaning.${draft.layout}`)}
                  </p>
                  <Grid>
                    <Column lg={8} md={4} sm={4}>
                      <section aria-label={t("reporting.available")}>
                        <h2>{t("reporting.available")}</h2>
                        <Search
                          id="reporting-search"
                          labelText={t("reporting.search")}
                          placeholder={t("reporting.search")}
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                        />
                        <div className="reporting-field-list">
                          {groups.map(([group, choices]) => (
                            <fieldset key={group}>
                              <legend>{t(`reporting.group.${group}`)}</legend>
                              {choices.map((field) => (
                                <Checkbox
                                  id={`reporting-field-${field.id}`}
                                  key={field.id}
                                  labelText={field.label}
                                  checked={selected.includes(field.id)}
                                  onChange={(_, { checked }) =>
                                    setColumns(
                                      checked
                                        ? [...selected, field.id]
                                        : selected.filter(
                                            (id) => id !== field.id,
                                          ),
                                    )
                                  }
                                />
                              ))}
                            </fieldset>
                          ))}
                        </div>
                      </section>
                    </Column>
                    <Column lg={8} md={4} sm={4}>
                      <section aria-label={t("reporting.selected")}>
                        <h2>
                          {t("reporting.selectedCount", {
                            count: selected.length,
                          })}
                        </h2>
                        <div
                          aria-live="polite"
                          className="reporting-announcement"
                        >
                          {positionMessage}
                        </div>
                        <ol className="reporting-selected">
                          {selected.map((id, index) => (
                            <li
                              key={id}
                              draggable
                              onDragStart={() => {
                                dragged.current = id;
                              }}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => {
                                event.preventDefault();
                                if (dragged.current)
                                  move(dragged.current, index);
                                dragged.current = null;
                              }}
                            >
                              <span>{byId.get(id)?.label || id}</span>
                              <div>
                                <Button
                                  kind="ghost"
                                  size="sm"
                                  hasIconOnly
                                  renderIcon={ArrowUp}
                                  iconDescription={t("reporting.moveUp", {
                                    field: byId.get(id)?.label || id,
                                  })}
                                  disabled={index === 0}
                                  onClick={() => move(id, index - 1)}
                                />
                                <Button
                                  kind="ghost"
                                  size="sm"
                                  hasIconOnly
                                  renderIcon={ArrowDown}
                                  iconDescription={t("reporting.moveDown", {
                                    field: byId.get(id)?.label || id,
                                  })}
                                  disabled={index === selected.length - 1}
                                  onClick={() => move(id, index + 1)}
                                />
                                <Button
                                  kind="ghost"
                                  size="sm"
                                  hasIconOnly
                                  renderIcon={Close}
                                  iconDescription={t("reporting.remove", {
                                    field: byId.get(id)?.label || id,
                                  })}
                                  onClick={() =>
                                    setColumns(
                                      selected.filter((value) => value !== id),
                                    )
                                  }
                                />
                              </div>
                            </li>
                          ))}
                        </ol>
                      </section>
                    </Column>
                  </Grid>
                </>
              ) : (
                <Tile>
                  <h2>{t("reporting.review")}</h2>
                  <p>
                    {catalog.data.definition.label} ·{" "}
                    {t(`reporting.layout.${draft.layout}`)}
                  </p>
                  <p>
                    {draft.dateFrom} – {draft.dateTo}
                  </p>
                  <p>{t(`reporting.meaning.${draft.layout}`)}</p>
                  <dl>
                    <dt>{t("reporting.labSections")}</dt>
                    <dd>
                      {lookup(catalog.data.labSections, draft.labSectionIds)}
                    </dd>
                    <dt>{t("reporting.tests")}</dt>
                    <dd>{lookup(catalog.data.tests, draft.testIds)}</dd>
                    <dt>{t("reporting.resultStatuses")}</dt>
                    <dd>
                      {draft.resultStatuses.length
                        ? lookup(catalog.data.statuses, draft.resultStatuses)
                        : t("reporting.finalized")}
                    </dd>
                  </dl>
                </Tile>
              )}
              {stale.length > 0 && (
                <InlineNotification
                  kind="warning"
                  title={t("reporting.columns.stale")}
                  hideCloseButton
                />
              )}
              <section
                className="reporting-preview"
                aria-label={t("reporting.headerPreview")}
              >
                <h3>{t("reporting.headerPreview")}</h3>
                <div>
                  <table>
                    <thead>
                      <tr>
                        {selected.map((id) => (
                          <th key={id}>{byId.get(id)?.label || id}</th>
                        ))}
                      </tr>
                    </thead>
                  </table>
                </div>
              </section>
              {submission.error && (
                <InlineNotification
                  kind="error"
                  title={t("reporting.submitError")}
                  subtitle={errorText(submission.error)}
                  hideCloseButton
                />
              )}
              <div className="reporting-actions">
                <div className="reporting-saved-actions">
                  {draft.savedReport ? (
                    <>
                      <Button
                        kind="tertiary"
                        disabled={!selected.length || stale.length > 0 || updateSaved.isLoading}
                        onClick={() => setUpdateOpen(true)}
                      >
                        {t("reporting.saved.update")}
                      </Button>
                      <Button
                        kind="ghost"
                        onClick={() => {
                          setSaveName(t("reporting.saved.copyName", { name: draft.savedReport.name }));
                          setSaveOpen(true);
                        }}
                      >
                        {t("reporting.saved.copy")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      kind="tertiary"
                      disabled={!selected.length || stale.length > 0}
                      onClick={() => {
                        setSaveName("");
                        setSaveOpen(true);
                      }}
                    >
                      {t("reporting.saved.save")}
                    </Button>
                  )}
                </div>
                {review && (
                  <Button
                    kind="secondary"
                    onClick={() => update({ review: false })}
                  >
                    {t("reporting.edit")}
                  </Button>
                )}
                <Button
                  disabled={
                    !selected.length ||
                    stale.length > 0 ||
                    !validPeriod ||
                    submission.isLoading ||
                    active(job.data)
                  }
                  onClick={() => (review ? run() : update({ review: true }))}
                >
                  {t(review ? "reporting.generate" : "reporting.review")}
                </Button>
              </div>
              {submission.isLoading && (
                <InlineLoading description={t("reporting.submitting")} />
              )}
            </>
          )}
          {job.data && (
            <section aria-label={t("reporting.currentReport")}>
              {jobCard(job.data)}
            </section>
          )}
          {job.error && (
            <InlineNotification
              kind="error"
              title={t("reporting.loadError")}
              hideCloseButton
            />
          )}
        </>
      )}
      <Modal
        open={saveOpen}
        modalHeading={t("reporting.saved.save")}
        primaryButtonText={t("reporting.saved.confirmSave")}
        secondaryButtonText={t("reporting.saved.cancel")}
        primaryButtonDisabled={!saveName.trim() || createSaved.isLoading}
        onRequestSubmit={saveCurrent}
        onRequestClose={() => setSaveOpen(false)}
      >
        {createSaved.error && (
          <InlineNotification
            kind="error"
            title={errorText(createSaved.error)}
            hideCloseButton
          />
        )}
        <TextInput
          id="reporting-saved-name"
          labelText={t("reporting.saved.name")}
          value={saveName}
          maxLength={200}
          onChange={(event) => setSaveName(event.target.value)}
        />
      </Modal>
      <Modal
        open={updateOpen}
        modalHeading={t("reporting.saved.update")}
        primaryButtonText={t("reporting.saved.confirmUpdate")}
        secondaryButtonText={t("reporting.saved.cancel")}
        onRequestSubmit={updateCurrent}
        onRequestClose={() => setUpdateOpen(false)}
      >
        <p>{t("reporting.saved.updateHelp", { name: draft.savedReport?.name })}</p>
      </Modal>
      <Modal
        danger
        open={!!deleteCandidate}
        modalHeading={t("reporting.saved.delete")}
        primaryButtonText={t("reporting.saved.confirmDelete")}
        secondaryButtonText={t("reporting.saved.cancel")}
        onRequestSubmit={() =>
          removeSaved.mutate({
            id: deleteCandidate.id,
            expectedVersion: deleteCandidate.version,
          })
        }
        onRequestClose={() => setDeleteCandidate(null)}
      >
        {removeSaved.error && (
          <InlineNotification
            kind="error"
            title={errorText(removeSaved.error)}
            hideCloseButton
          />
        )}
        <p>{t("reporting.saved.deleteHelp", { name: deleteCandidate?.name })}</p>
      </Modal>
    </main>
  );
}

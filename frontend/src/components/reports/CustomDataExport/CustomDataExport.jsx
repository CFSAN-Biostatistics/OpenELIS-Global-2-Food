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
import { downloadUrl, reportingPath, submitReport } from "./api";
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
  const [showQueue, setShowQueue] = useState(false);
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
    enabled: showQueue,
    refetchInterval: (data) => (data?.activeCount > 0 ? 2000 : false),
  });
  const submission = useMutation({
    mutationFn: submitReport,
    onSuccess: (result) => {
      queryClient.setQueryData(["reporting-job", owner, result.id], result);
      setDraft((value) => ({ ...value, jobId: result.id }));
      queryClient.invalidateQueries({ queryKey: ["reporting-queue", owner] });
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
        <Button kind="tertiary" onClick={() => setShowQueue(!showQueue)}>
          {t(showQueue ? "reporting.builder" : "reporting.queue")}
        </Button>
      </div>
      {(types.error || catalog.error) && (
        <InlineNotification
          kind="error"
          title={t("reporting.loadError")}
          subtitle={errorText(types.error || catalog.error)}
          hideCloseButton
        />
      )}
      {showQueue ? (
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
      ) : (
        <>
          {catalog.isLoading && (
            <InlineLoading description={t("reporting.loading")} />
          )}
          {catalog.data && (
            <>
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
    </main>
  );
}

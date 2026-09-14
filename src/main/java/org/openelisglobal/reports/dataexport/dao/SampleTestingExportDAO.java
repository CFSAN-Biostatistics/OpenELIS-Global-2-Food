package org.openelisglobal.reports.dataexport.dao;

import java.util.List;
import java.util.stream.Stream;
import org.openelisglobal.common.dao.BaseDAO;
import org.openelisglobal.patient.valueholder.Patient;
import org.openelisglobal.reports.dataexport.form.ExportSnapshot;
import org.openelisglobal.result.valueholder.Result;
import org.openelisglobal.test.valueholder.Test;
import org.openelisglobal.testresultcomponent.valueholder.TestResultComponent;

public interface SampleTestingExportDAO extends BaseDAO<Result, String> {
    Stream<Result> stream(ExportSnapshot request);

    List<Test> tests();

    List<TestResultComponent> components();

    Patient patient(String sampleId);

    String dictionary(String id);

    List<String> qualifiers(String resultId);

    void clearReadBatch();
}

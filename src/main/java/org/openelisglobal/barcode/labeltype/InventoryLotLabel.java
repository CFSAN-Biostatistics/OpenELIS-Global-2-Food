package org.openelisglobal.barcode.labeltype;

import java.util.ArrayList;
import org.openelisglobal.barcode.LabelField;
import org.openelisglobal.internationalization.MessageUtil;

/**
 * Label for an inventory lot: the barcode, with item name and lot number above
 * and expiry below, on the fixed 3x1 inch stock storage labels already use.
 */
public class InventoryLotLabel extends Label {

    /**
     * @param itemName    Catalog item name, e.g. "Test Reagent A"
     * @param lotNumber   The lot number as printed by the manufacturer, or
     *                    generated on receipt
     * @param expiryDate  Preformatted expiry date, blank when the lot has none
     * @param barcodeCode The lot's internal barcode — the value that is encoded
     */
    public InventoryLotLabel(String itemName, String lotNumber, String expiryDate, String barcodeCode) {
        width = 3.0f;
        height = 1.0f;

        aboveFields = new ArrayList<>();
        belowFields = new ArrayList<>();

        // The (key, String) getMessage overload takes a parameter, not a default.
        LabelField nameField = new LabelField(MessageUtil.getMessage("barcode.label.info.itemName"),
                itemName != null ? itemName : "", 12);
        nameField.setDisplayFieldName(true);
        nameField.setUnderline(true);
        aboveFields.add(nameField);

        LabelField lotField = new LabelField(MessageUtil.getMessage("barcode.label.info.lotNumber"),
                lotNumber != null ? lotNumber : "", 8);
        lotField.setDisplayFieldName(true);
        aboveFields.add(lotField);

        LabelField expiryField = new LabelField(MessageUtil.getMessage("barcode.label.info.expiryDate"),
                expiryDate != null ? expiryDate : "", 8);
        expiryField.setDisplayFieldName(true);
        belowFields.add(expiryField);

        String barcodeValue = barcodeCode != null ? barcodeCode.trim() : "";
        setCode(barcodeValue);
        setCodeLabel(barcodeValue);
    }

    @Override
    public int getNumTextRowsBefore() {
        return getNumRows(aboveFields);
    }

    @Override
    public int getNumTextRowsAfter() {
        return getNumRows(belowFields);
    }

    @Override
    public int getMaxNumLabels() {
        // A lot can be split across many containers, so there is no sensible cap.
        return Integer.MAX_VALUE;
    }
}

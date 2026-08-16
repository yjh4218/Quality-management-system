-- V96: Update packaging specification marking text format from [생산배치번호] to LOT(제조번호)

UPDATE packaging_specifications 
SET container_marking_text = REPLACE(REPLACE(container_marking_text, 'LOT [생산배치번호]', 'LOT(제조번호)'), '[생산배치번호]', 'LOT(제조번호)')
WHERE container_marking_text LIKE '%생산배치번호%';

UPDATE packaging_specifications 
SET unit_box_marking_text = REPLACE(REPLACE(unit_box_marking_text, 'LOT [생산배치번호]', 'LOT(제조번호)'), '[생산배치번호]', 'LOT(제조번호)')
WHERE unit_box_marking_text LIKE '%생산배치번호%';

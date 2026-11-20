import { getDataSource, getRepository } from '../../../database/index.js';
import { Visit } from '../../../database/entities/visit.entity.js';
import { VisitEvent } from '../../../database/entities/visit-event.entity.js';
import { Campaign } from '../../../database/entities/campaign.entity.js';
import { Vendor } from '../../../database/entities/vendor.entity.js';
import { applyVisitFilters } from '../queries/db-query.builder.js';

export const exportLogs = async (params, format, res) => {
  const campaignRepo = getRepository(Campaign);
  const vendorRepo = getRepository(Vendor);

  const [allCampaigns, allVendors] = await Promise.all([
    campaignRepo.find({ select: ['id', 'name'] }),
    vendorRepo.find({ select: ['id', 'name', 'code'] }),
  ]);

  const campaignMap = new Map();
  for (const c of allCampaigns) {
    campaignMap.set(c.id, c.name);
  }

  const vendorMap = new Map();
  for (const v of allVendors) {
    vendorMap.set(v.id, v.code ? `${v.name} (${v.code})` : v.name);
  }

  const queryBuilder = getRepository(Visit).createQueryBuilder('visit');
  applyVisitFilters(queryBuilder, params);

  queryBuilder
    .orderBy('visit.updatedAt', 'DESC')
    .addOrderBy('visit.id', 'DESC')
    .take(50000);

  const visits = await queryBuilder.getMany();
  const ids = visits.map((v) => v.id).filter(Boolean);

  const eventCountByVisit = new Map();
  const lastEventByVisit = new Map();
  const chunkSize = 2000;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const counts = await getRepository(VisitEvent)
      .createQueryBuilder('e')
      .select('e.visitId', 'visitId')
      .addSelect('COUNT(e.id)', 'cnt')
      .where('e.visitId IN (:...chunk)', { chunk })
      .groupBy('e.visitId')
      .getRawMany();
    for (const row of counts) {
      eventCountByVisit.set(Number(row.visitId), Number(row.cnt) || 0);
    }

    const dbType = getDataSource().options.type;
    if (dbType === 'postgres') {
      const lasts = await getRepository(VisitEvent)
        .createQueryBuilder('e')
        .distinctOn(['e.visitId'])
        .where('e.visitId IN (:...chunk)', { chunk })
        .orderBy('e.visitId', 'ASC')
        .addOrderBy('e.createdAt', 'DESC')
        .getMany();
      for (const e of lasts) {
        lastEventByVisit.set(e.visitId, e.eventType);
      }
    } else {
      for (const id of chunk) {
        const last = await getRepository(VisitEvent).findOne({
          where: { visitId: id },
          order: { createdAt: 'DESC' },
        });
        if (last) lastEventByVisit.set(id, last.eventType);
      }
    }
  }

  const tz = params.timezone || 'Asia/Kolkata';
  const formatLocalTime = (date) => {
    if (!date) return '';
    try {
      const d = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat('sv-SE', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
        .format(d)
        .replace(' ', ' ');
    } catch {
      return String(date);
    }
  };

  const rows = visits.map((visit) => {
    const eventType = lastEventByVisit.get(visit.id) || '';
    const eventCount = eventCountByVisit.get(visit.id) || 0;
    const campaignName =
      campaignMap.get(visit.campaignId) ||
      (visit.campaignId ? `Campaign #${visit.campaignId}` : '');
    const vendorName =
      vendorMap.get(visit.vendorId) || visit.vidRaw || '';
    const localTime = formatLocalTime(visit.createdAt || visit.updatedAt);
    const utcTime = (visit.createdAt || visit.updatedAt)?.toISOString?.() || '';

    return {
      visitId: visit.id,
      clickId: visit.clickId || '',
      rcid: visit.rcid || '',
      localTime,
      utcTime,
      campaignId: visit.campaignId ?? '',
      campaignName,
      country: visit.country || '',
      operator: visit.operator || '',
      vendorId: visit.vendorId ?? '',
      vendorName,
      campid: visit.campid || '',
      trackingCampid: visit.trackingCampid || '',
      phone: visit.phone || '',
      lastEvent: eventType,
      eventCount,
      status: visit.visitStatus || '',
      ip: visit.ipAddress || '',
      userAgent: visit.userAgent || '',
    };
  });

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filenameBase = `campaign-logs-${Array.isArray(params.campaignId) ? 'all' : params.campaignId || 'all'}-${timestampStr}`;

  if (format === 'xlsx') {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TemplateCraft Analytics';
    const sheet = workbook.addWorksheet('Campaign Logs');

    sheet.columns = [
      { header: 'Visit ID', key: 'visitId', width: 12 },
      { header: 'Click ID', key: 'clickId', width: 28 },
      { header: 'RCID', key: 'rcid', width: 24 },
      { header: `Local Time (${tz})`, key: 'localTime', width: 22 },
      { header: 'UTC Time', key: 'utcTime', width: 24 },
      { header: 'Campaign ID', key: 'campaignId', width: 14 },
      { header: 'Campaign Name', key: 'campaignName', width: 28 },
      { header: 'Country', key: 'country', width: 10 },
      { header: 'Operator', key: 'operator', width: 14 },
      { header: 'Vendor ID', key: 'vendorId', width: 12 },
      { header: 'Vendor / Partner', key: 'vendorName', width: 24 },
      { header: 'Campid', key: 'campid', width: 18 },
      { header: 'Tracking Campid', key: 'trackingCampid', width: 20 },
      { header: 'Phone / MSISDN', key: 'phone', width: 18 },
      { header: 'Last Event', key: 'lastEvent', width: 22 },
      { header: 'Event Count', key: 'eventCount', width: 14 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'IP Address', key: 'ip', width: 18 },
      { header: 'User Agent', key: 'userAgent', width: 40 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    for (const r of rows) {
      sheet.addRow(r);
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filenameBase}.xlsx"`,
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return res.send(buffer);
  }

  // Fallback to CSV
  const headers = [
    'Visit ID',
    'Click ID',
    'RCID',
    `Local Time (${tz})`,
    'UTC Time',
    'Campaign ID',
    'Campaign Name',
    'Country',
    'Operator',
    'Vendor ID',
    'Vendor / Partner',
    'Campid',
    'Tracking Campid',
    'Phone / MSISDN',
    'Last Event',
    'Event Count',
    'Status',
    'IP Address',
    'User Agent',
  ];

  let csvContent = '\uFEFF';
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (
      str.includes(',') ||
      str.includes('"') ||
      str.includes('\n') ||
      str.includes('\r')
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  csvContent += headers.map(escapeCsv).join(',') + '\r\n';

  for (const r of rows) {
    const line = [
      r.visitId,
      r.clickId,
      r.rcid,
      r.localTime,
      r.utcTime,
      r.campaignId,
      r.campaignName,
      r.country,
      r.operator,
      r.vendorId,
      r.vendorName,
      r.campid,
      r.trackingCampid,
      r.phone,
      r.lastEvent,
      r.eventCount,
      r.status,
      r.ip,
      r.userAgent,
    ]
      .map(escapeCsv)
      .join(',');
    csvContent += line + '\r\n';
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filenameBase}.csv"`,
  );
  return res.send(csvContent);
};

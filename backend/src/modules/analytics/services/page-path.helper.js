import { VisitEventType } from '../../../database/entities/visit-event.entity.js';

export const derivePagePath = (visit) => {
  const eventToPage = {
    [VisitEventType.VISIT]: 'HOME',
    [VisitEventType.HOME_VIEW]: 'HOME',
    [VisitEventType.OTP_VIEW]: 'OTP',
    [VisitEventType.OTP_SEND]: 'OTP',
    [VisitEventType.OTP_VERIFY]: 'OTP',
    [VisitEventType.CONFIRM_VIEW]: 'CONFIRM',
    [VisitEventType.SUBSCRIBE_SUCCESS]: 'THANKYOU',
    [VisitEventType.SUBSCRIBE_FAILED]: 'ERROR',
    [VisitEventType.BLOCKED]: 'BLOCKED',
  };

  const pages = [];
  for (const event of visit?.events || []) {
    const page = eventToPage[event.eventType];
    if (page && pages[pages.length - 1] !== page) {
      pages.push(page);
    }
  }

  const finalPage = visit?.pageType || 'HOME';
  if (pages.length === 0 || pages[pages.length - 1] !== finalPage) {
    pages.push(finalPage);
  }

  return pages;
};

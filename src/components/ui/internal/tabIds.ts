/** Shared id scheme so <Tabs> and <TabPanel> reference each other without context. */
export function tabDomId(prefix: string, id: string) {
  return `${prefix}-tab-${id}`;
}

export function tabPanelDomId(prefix: string, id: string) {
  return `${prefix}-panel-${id}`;
}

export type CustomerStatus = 'active' | 'suspended' | 'deletion_pending' | 'deleted';

export type CustomerProfile = {
  customerId: string;
  cognitoSubject: string;
  loginName: string;
  status: CustomerStatus;
  legalName: string;
  displayName: string;
  phone: string;
  email: string;
  locale: 'ko' | 'en';
  country: string;
  organization: string;
  team: string;
  verificationMethod: 'email_declaration' | 'sms_declaration';
  verifiedAt: string;
  adultVerified: boolean;
  sessionVersion: number;
  sessionsValidAfter: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerInquiry = {
  id: string;
  source: 'contact' | 'golf';
  status: 'new' | 'contacted' | 'in_progress' | 'done' | 'spam';
  locale: 'ko' | 'en';
  name: string;
  phone: string;
  email: string;
  organization: string;
  inquiryType: string;
  team: string;
  quantity: number | null;
  dueDate: string;
  useCase: string;
  message: string;
  configuration: Record<string, unknown>;
  customerId: string;
  linkSource: string;
  linkedAt: string;
  createdAt: string;
  updatedAt: string;
};

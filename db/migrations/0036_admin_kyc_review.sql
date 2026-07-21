-- Permission for reviewing and approving individual KYC applications.

INSERT INTO admin_permissions (
  key,
  type_key,
  label
)
VALUES (
  'kyc.review',
  'finance',
  'Review and approve individual KYC applications'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_role_permissions (
  role_name,
  permission_key
)
SELECT
  ar.name,
  'kyc.review'
FROM admin_roles AS ar
WHERE ar.name IN (
  'super_admin',
  'kyc_reviewer',
  'finance'
)
ON CONFLICT (role_name, permission_key) DO NOTHING;

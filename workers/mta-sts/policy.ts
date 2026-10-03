// The MTA-STS policy document, kept out of the Worker entrypoint: workerd
// rejects any named export from the entry module that is not a handler
// ("Incorrect type for map entry 'POLICY'"), and the Worker fails to boot. The
// tests import it from here.
//
// The mx: set matches Google's own policy at mta-sts.google.com. Our MX is the
// single modern smtp.google.com record, but the legacy ASPMX names are listed
// too: once mode is enforce, an MX this file does not list means refused mail,
// and this file is the thing least likely to be updated during an MX change.
//
// mode: testing collects TLS-RPT reports without enforcing anything. Flip to
// enforce only after reading a couple of weeks of reports — and bump `id` in
// the _mta-sts TXT record in the same change, or senders keep serving
// themselves the cached policy until max_age expires.
export const POLICY = [
  'version: STSv1',
  'mode: testing',
  'mx: smtp.google.com',
  'mx: aspmx.l.google.com',
  'mx: *.aspmx.l.google.com',
  'max_age: 604800',
  '',
].join('\n');

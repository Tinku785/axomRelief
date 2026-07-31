-- The public "I will attend this" button was removed from the rescuer list;
-- status is now set by an admin after phoning the family. That leaves the anon
-- UPDATE policy from 0008 as a public write path with no feature behind it, so
-- it goes: an unused way to write to the requests table is only ever a
-- liability.
--
-- The guard trigger stays. It costs nothing with no anon policy to let a row
-- through, and it is what makes re-enabling the button a one-line change
-- instead of a security review.

drop policy if exists "anyone can claim a request" on public.requests;

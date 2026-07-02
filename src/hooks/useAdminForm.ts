import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { extractErrorMessage } from "@/services/http";
import { toast } from "@/hooks/use-toast";

// The load→edit→save→navigate lifecycle every simple admin form re-implements:
// an alive-guarded fetch in edit mode, loading/saving/error flags, and a submit
// wrapper that toasts on success then routes back to the list. Sub-resource-
// heavy forms (AdminCaseForm, EntityEdit) keep their own state; this covers the
// flat record forms (courts, firms, court cases).
//
// Field state is owned by the caller (useState<T>) so field validators, derived
// values, and payload shaping stay in the page. This hook owns only the async
// plumbing.

interface UseAdminFormOptions<T> {
  // Whether the form is editing an existing record (drives the load + button copy).
  editing: boolean;
  // Fetch the record in edit mode and map it into form state. Skipped on create.
  load?: () => Promise<T>;
  // Push the mapped record into the caller's field state.
  hydrate: (record: T) => void;
  // Where to go after a successful save (also the Back/Cancel target).
  listPath: string;
  // Human label for toasts + fallback error messages (e.g. "court").
  resourceLabel: string;
  // Identity of the record being edited (e.g. the route PK). Included in the
  // load effect's deps so navigating between two edit routes on the SAME mounted
  // component (React Router reuses the instance) re-fetches the new record
  // instead of keeping the previous one's field values.
  recordKey?: string;
}

interface UseAdminFormResult {
  loading: boolean;
  saving: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
  // Wrap a save: sets saving/error, runs `save`, toasts, navigates to the list.
  // Returns a submit handler for <form onSubmit>. `canSave` short-circuits.
  handleSubmit: (
    canSave: boolean,
    save: () => Promise<void>,
  ) => (e: React.FormEvent) => Promise<void>;
  navigate: ReturnType<typeof useNavigate>;
}

export function useAdminForm<T>({
  editing,
  load,
  hydrate,
  listPath,
  resourceLabel,
  recordKey,
}: UseAdminFormOptions<T>): UseAdminFormResult {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest hydrate/load without retriggering the load effect on every
  // render (callers pass inline closures).
  const hydrateRef = useRef(hydrate);
  hydrateRef.current = hydrate;
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!editing || !loadRef.current) return;
    let alive = true;
    setLoading(true);
    setError(null);
    loadRef
      .current()
      .then((record) => {
        if (alive) hydrateRef.current(record);
      })
      .catch((err) => {
        if (alive)
          setError(extractErrorMessage(err, `Failed to load ${resourceLabel}`));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [editing, resourceLabel, recordKey]);

  const handleSubmit = useCallback(
    (canSave: boolean, save: () => Promise<void>) =>
      async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSave) return;
        setSaving(true);
        setError(null);
        try {
          await save();
          const label =
            resourceLabel.charAt(0).toUpperCase() + resourceLabel.slice(1);
          toast({ title: editing ? `${label} updated` : `${label} created` });
          navigate(listPath);
        } catch (err) {
          setError(extractErrorMessage(err, `Failed to save ${resourceLabel}`));
        } finally {
          setSaving(false);
        }
      },
    [editing, listPath, navigate, resourceLabel],
  );

  return { loading, saving, error, setError, handleSubmit, navigate };
}

'use client';

import { Bell, Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api-client';
import { useSession } from '@/lib/auth-client';
import {
  AlertResponse,
  type AlertResponseType,
  type AlertSeasonType,
  type AlertTimeframeType,
  AlertsListResponse,
} from '@/lib/contracts/alerts';

const ANY_FILTER = '__any';

const FIELDS = [
  'Software Engineering',
  'Data Science',
  'AI / Machine Learning',
  'Cybersecurity',
  'Product Management',
  'Finance',
  'Marketing',
  'Consulting',
  'Business',
  'Engineering',
  'Healthcare',
  'Design',
  'Operations',
  'Other',
];

const COMPANY_OPTIONS = [
  'Microsoft',
  'Google',
  'Amazon',
  'Apple',
  'Meta',
  'NVIDIA',
  'Adobe',
  'Oracle',
  'Cisco',
  'Intel',
  'Dell Technologies',
  'HP Inc.',
  'OpenAI',
  'Anthropic',
  'Cohere',
  'Scale AI',
  'Databricks',
  'Snowflake',
  'Palantir Technologies',
  'Salesforce',
  'ServiceNow',
  'Workday',
  'SAP',
  'Atlassian',
  'HubSpot',
  'Intuit',
  'Zoom Communications',
  'Accenture',
  'Deloitte',
  'PwC',
  'EY',
  'KPMG',
  'Booz Allen Hamilton',
  'Capgemini',
  'Slalom',
  'JPMorgan Chase',
  'Goldman Sachs',
  'Morgan Stanley',
  'Capital One',
  'American Express',
  'Visa',
  'Mastercard',
  'Fidelity Investments',
  'Charles Schwab',
  'Robinhood',
  'SoFi',
  'Stripe',
  'Block',
  'Plaid',
  'PayPal',
  'Nike',
  'PepsiCo',
  'The Coca-Cola Company',
  'Johnson & Johnson',
  'Procter & Gamble',
  'Unilever',
  "L'Oreal",
  'Delta Air Lines',
  'United Airlines',
  'American Airlines',
  'Marriott International',
  'Hilton',
  'Walmart',
  'Target',
  'Costco Wholesale',
  'Kaseya',
  'Chewy',
  'Ryder System',
  'Royal Caribbean Group',
  'Norwegian Cruise Line Holdings',
  'Lennar',
  'Airbnb',
  'Coinbase',
  'Discord',
  'DoorDash',
  'Figma',
  'Ramp',
  'Perplexity',
];

const LOCATION_OPTIONS = [
  'Remote',
  'United States',
  'New York, NY',
  'San Francisco, CA',
  'San Jose, CA',
  'Los Angeles, CA',
  'Seattle, WA',
  'Redmond, WA',
  'Boston, MA',
  'Cambridge, MA',
  'Chicago, IL',
  'Austin, TX',
  'Dallas, TX',
  'Houston, TX',
  'Miami, FL',
  'South Florida',
  'Atlanta, GA',
  'Washington, DC',
  'Arlington, VA',
  'Charlotte, NC',
  'Raleigh, NC',
  'Denver, CO',
  'Phoenix, AZ',
  'California',
  'Florida',
  'Texas',
  'New York',
  'Washington',
];

const TIMEFRAME_OPTIONS: Array<{ value: AlertTimeframeType; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'three_days', label: 'Every 3 days' },
  { value: 'weekly', label: 'Weekly' },
];

const SEASON_OPTIONS: Array<{ value: AlertSeasonType; label: string }> = [
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
];

type TokenPickerProps = {
  label: string;
  selectPlaceholder: string;
  inputPlaceholder: string;
  options: string[];
  values: string[];
  selectedValue: string;
  inputValue: string;
  setSelectedValue: Dispatch<SetStateAction<string>>;
  setInputValue: Dispatch<SetStateAction<string>>;
  addValue: (value: string) => void;
  removeValue: (value: string) => void;
};

function addUnique(values: string[], value: string): string[] {
  const nextValue = value.trim();
  if (!nextValue || values.some((item) => item.toLowerCase() === nextValue.toLowerCase())) {
    return values;
  }
  return [...values, nextValue];
}

function alertFields(alert: AlertResponseType): string[] {
  return alert.fieldNames.length > 0 ? alert.fieldNames : alert.field ? [alert.field] : [];
}

function alertLocations(alert: AlertResponseType): string[] {
  return alert.locations.length > 0 ? alert.locations : alert.location ? [alert.location] : [];
}

function fieldLabel(alert: AlertResponseType): string {
  const fields = alertFields(alert);
  return fields.length > 0 ? fields.join(', ') : 'Any field';
}

function locationLabel(alert: AlertResponseType): string {
  const locations = alertLocations(alert);
  return locations.length > 0 ? locations.join(', ') : 'Any location';
}

function timeframeLabel(value: AlertTimeframeType): string {
  return TIMEFRAME_OPTIONS.find((option) => option.value === value)?.label ?? 'Daily';
}

function seasonLabel(value: AlertSeasonType | null): string {
  return SEASON_OPTIONS.find((option) => option.value === value)?.label ?? 'Any season';
}

function hasCriteria(
  companies: string[],
  fields: string[],
  locations: string[],
  ...inputs: string[]
) {
  return (
    companies.length > 0 ||
    fields.length > 0 ||
    locations.length > 0 ||
    inputs.some((input) => input.trim().length > 0)
  );
}

function errorMessage(error: unknown, fallback: string): string {
  if (
    error instanceof Error &&
    typeof error.cause === 'object' &&
    error.cause &&
    'error' in error.cause &&
    typeof error.cause.error === 'string'
  ) {
    return error.cause.error;
  }
  return fallback;
}

function TokenPicker({
  label,
  selectPlaceholder,
  inputPlaceholder,
  options,
  values,
  selectedValue,
  inputValue,
  setSelectedValue,
  setInputValue,
  addValue,
  removeValue,
}: TokenPickerProps) {
  function addTypedValue() {
    addValue(inputValue);
    setInputValue('');
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={selectedValue}
        onValueChange={(value) => {
          addValue(value);
          setSelectedValue('');
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={selectPlaceholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Input
          placeholder={inputPlaceholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTypedValue();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addTypedValue}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {values.map((name) => (
            <Badge key={name} variant="secondary" className="flex items-center gap-1 pr-1">
              {name}
              <button
                type="button"
                onClick={() => removeValue(name)}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remove ${name}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function AlertsIsland() {
  const { data: session, isPending } = useSession();
  const [alerts, setAlerts] = useState<AlertResponseType[]>([]);
  const [loading, setLoading] = useState(true);

  const [companyInput, setCompanyInput] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companyNames, setCompanyNames] = useState<string[]>([]);
  const [fieldInput, setFieldInput] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [fieldNames, setFieldNames] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [season, setSeason] = useState<AlertSeasonType | null>(null);
  const [timeframe, setTimeframe] = useState<AlertTimeframeType>('daily');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCompanyInput, setEditCompanyInput] = useState('');
  const [editSelectedCompany, setEditSelectedCompany] = useState('');
  const [editCompanyNames, setEditCompanyNames] = useState<string[]>([]);
  const [editFieldInput, setEditFieldInput] = useState('');
  const [editSelectedField, setEditSelectedField] = useState('');
  const [editFieldNames, setEditFieldNames] = useState<string[]>([]);
  const [editLocationInput, setEditLocationInput] = useState('');
  const [editSelectedLocation, setEditSelectedLocation] = useState('');
  const [editLocations, setEditLocations] = useState<string[]>([]);
  const [editSeason, setEditSeason] = useState<AlertSeasonType | null>(null);
  const [editTimeframe, setEditTimeframe] = useState<AlertTimeframeType>('daily');
  const [savingId, setSavingId] = useState<string | null>(null);
  const canCreate = hasCriteria(
    companyNames,
    fieldNames,
    locations,
    companyInput,
    fieldInput,
    locationInput,
  );

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setLoading(false);
      return;
    }

    apiFetch('/api/alerts', { schema: AlertsListResponse })
      .then((data) => setAlerts(data.alerts))
      .catch(() => toast.error('Failed to load alerts'))
      .finally(() => setLoading(false));
  }, [session, isPending]);

  function resetCreateForm() {
    setCompanyNames([]);
    setCompanyInput('');
    setSelectedCompany('');
    setFieldNames([]);
    setFieldInput('');
    setSelectedField('');
    setLocations([]);
    setLocationInput('');
    setSelectedLocation('');
    setSeason(null);
    setTimeframe('daily');
  }

  async function createAlert() {
    const nextCompanyNames = addUnique(companyNames, companyInput);
    const nextFieldNames = addUnique(fieldNames, fieldInput);
    const nextLocations = addUnique(locations, locationInput);

    setCreating(true);
    try {
      const newAlert = await apiFetch('/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          companyNames: nextCompanyNames,
          fieldNames: nextFieldNames,
          locations: nextLocations,
          season,
          timeframe,
        }),
        schema: AlertResponse,
      });
      setAlerts((prev) => [newAlert, ...prev]);
      resetCreateForm();
      toast.success('Alert created');
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to create alert'));
    } finally {
      setCreating(false);
    }
  }

  function startEditing(alert: AlertResponseType) {
    setEditingId(alert.id);
    setEditCompanyNames(alert.companyNames);
    setEditCompanyInput('');
    setEditSelectedCompany('');
    setEditFieldNames(alertFields(alert));
    setEditFieldInput('');
    setEditSelectedField('');
    setEditLocations(alertLocations(alert));
    setEditLocationInput('');
    setEditSelectedLocation('');
    setEditSeason(alert.season);
    setEditTimeframe(alert.timeframe);
  }

  function cancelEditing() {
    setEditingId(null);
    setSavingId(null);
  }

  async function saveAlert(id: string) {
    const nextCompanyNames = addUnique(editCompanyNames, editCompanyInput);
    const nextFieldNames = addUnique(editFieldNames, editFieldInput);
    const nextLocations = addUnique(editLocations, editLocationInput);

    setSavingId(id);
    try {
      const updatedAlert = await apiFetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          companyNames: nextCompanyNames,
          fieldNames: nextFieldNames,
          locations: nextLocations,
          season: editSeason,
          timeframe: editTimeframe,
        }),
        schema: AlertResponse,
      });
      setAlerts((prev) => prev.map((alert) => (alert.id === id ? updatedAlert : alert)));
      setEditingId(null);
      toast.success('Alert updated');
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to update alert'));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteAlert(id: string) {
    try {
      await apiFetch(`/api/alerts/${id}`, { method: 'DELETE' });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      if (editingId === id) setEditingId(null);
      toast.success('Alert deleted');
    } catch {
      toast.error('Failed to delete alert');
    }
  }

  if (isPending || loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading alerts...</p>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-gutter py-section">
        <Card className="w-full max-w-md shadow-brand border border-border/60 bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-h4">Not signed in</CardTitle>
            <CardDescription>Sign in to manage your job alerts</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Button asChild className="w-full">
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh px-gutter py-section bg-[var(--background)]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-20%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[var(--brand-100)] opacity-30 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[var(--brand-200)] opacity-20 blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="size-7 text-brand-500" />
          <div>
            <h1 className="text-h3 font-bold text-foreground">Job Alerts</h1>
            <p className="text-muted-foreground text-body">
              Get emails when new internships match your companies, fields, or locations
            </p>
          </div>
        </div>

        <Card className="shadow-brand border border-border/60 bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-h4 flex items-center gap-2">
              <Plus className="size-4 text-brand-500" />
              New alert
            </CardTitle>
            <CardDescription>
              Watch several companies, fields, and locations in one alert
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <TokenPicker
              label="Company watchlist"
              selectPlaceholder="Select a company"
              inputPlaceholder="Or type any company"
              options={COMPANY_OPTIONS}
              values={companyNames}
              selectedValue={selectedCompany}
              inputValue={companyInput}
              setSelectedValue={setSelectedCompany}
              setInputValue={setCompanyInput}
              addValue={(value) => setCompanyNames((prev) => addUnique(prev, value))}
              removeValue={(value) =>
                setCompanyNames((prev) => prev.filter((name) => name !== value))
              }
            />

            <TokenPicker
              label="Fields / roles"
              selectPlaceholder="Select a field"
              inputPlaceholder="Or type any field or role"
              options={FIELDS}
              values={fieldNames}
              selectedValue={selectedField}
              inputValue={fieldInput}
              setSelectedValue={setSelectedField}
              setInputValue={setFieldInput}
              addValue={(value) => setFieldNames((prev) => addUnique(prev, value))}
              removeValue={(value) =>
                setFieldNames((prev) => prev.filter((name) => name !== value))
              }
            />

            <TokenPicker
              label="Locations"
              selectPlaceholder="Select a location"
              inputPlaceholder="Or type any city, state, or remote"
              options={LOCATION_OPTIONS}
              values={locations}
              selectedValue={selectedLocation}
              inputValue={locationInput}
              setSelectedValue={setSelectedLocation}
              setInputValue={setLocationInput}
              addValue={(value) => setLocations((prev) => addUnique(prev, value))}
              removeValue={(value) => setLocations((prev) => prev.filter((name) => name !== value))}
            />

            <div className="space-y-2">
              <Label>Season</Label>
              <Select
                value={season ?? ANY_FILTER}
                onValueChange={(value) =>
                  setSeason(value === ANY_FILTER ? null : (value as AlertSeasonType))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_FILTER}>Any season</SelectItem>
                  {SEASON_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Timeframe</Label>
              <Select
                value={timeframe}
                onValueChange={(value) => setTimeframe(value as AlertTimeframeType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={createAlert}
              disabled={creating || !canCreate}
            >
              <Bell className="size-4 mr-2" />
              {creating ? 'Creating...' : 'Create Alert'}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-h4 font-semibold text-foreground">Your alerts</h2>

          {alerts.length === 0 ? (
            <Card className="border border-border/40 bg-card/60">
              <CardContent className="py-8 text-center">
                <Bell className="size-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-body">
                  No alerts yet. Create one above to get emails when new internships match.
                </p>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card
                key={alert.id}
                className="shadow-sm border border-border/60 bg-card/95 backdrop-blur-sm"
              >
                <CardContent className="pt-4 pb-3">
                  {editingId === alert.id ? (
                    <div className="space-y-4">
                      <TokenPicker
                        label="Company watchlist"
                        selectPlaceholder="Select a company"
                        inputPlaceholder="Or type any company"
                        options={COMPANY_OPTIONS}
                        values={editCompanyNames}
                        selectedValue={editSelectedCompany}
                        inputValue={editCompanyInput}
                        setSelectedValue={setEditSelectedCompany}
                        setInputValue={setEditCompanyInput}
                        addValue={(value) => setEditCompanyNames((prev) => addUnique(prev, value))}
                        removeValue={(value) =>
                          setEditCompanyNames((prev) => prev.filter((name) => name !== value))
                        }
                      />

                      <TokenPicker
                        label="Fields / roles"
                        selectPlaceholder="Select a field"
                        inputPlaceholder="Or type any field or role"
                        options={FIELDS}
                        values={editFieldNames}
                        selectedValue={editSelectedField}
                        inputValue={editFieldInput}
                        setSelectedValue={setEditSelectedField}
                        setInputValue={setEditFieldInput}
                        addValue={(value) => setEditFieldNames((prev) => addUnique(prev, value))}
                        removeValue={(value) =>
                          setEditFieldNames((prev) => prev.filter((name) => name !== value))
                        }
                      />

                      <TokenPicker
                        label="Locations"
                        selectPlaceholder="Select a location"
                        inputPlaceholder="Or type any city, state, or remote"
                        options={LOCATION_OPTIONS}
                        values={editLocations}
                        selectedValue={editSelectedLocation}
                        inputValue={editLocationInput}
                        setSelectedValue={setEditSelectedLocation}
                        setInputValue={setEditLocationInput}
                        addValue={(value) => setEditLocations((prev) => addUnique(prev, value))}
                        removeValue={(value) =>
                          setEditLocations((prev) => prev.filter((name) => name !== value))
                        }
                      />

                      <div className="space-y-2">
                        <Label>Season</Label>
                        <Select
                          value={editSeason ?? ANY_FILTER}
                          onValueChange={(value) =>
                            setEditSeason(value === ANY_FILTER ? null : (value as AlertSeasonType))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose season" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ANY_FILTER}>Any season</SelectItem>
                            {SEASON_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Timeframe</Label>
                        <Select
                          value={editTimeframe}
                          onValueChange={(value) => setEditTimeframe(value as AlertTimeframeType)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose timeframe" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEFRAME_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="flex-1"
                          onClick={() => saveAlert(alert.id)}
                          disabled={
                            savingId === alert.id ||
                            !hasCriteria(
                              editCompanyNames,
                              editFieldNames,
                              editLocations,
                              editCompanyInput,
                              editFieldInput,
                              editLocationInput,
                            )
                          }
                        >
                          <Save className="size-4 mr-2" />
                          {savingId === alert.id ? 'Saving...' : 'Save'}
                        </Button>
                        <Button type="button" variant="outline" onClick={cancelEditing}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <p className="font-semibold text-foreground text-body leading-snug">
                          {fieldLabel(alert)} - {locationLabel(alert)}
                        </p>
                        {alert.companyNames.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {alert.companyNames.map((name) => (
                              <Badge key={name} variant="outline" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {seasonLabel(alert.season)}
                          {' - '}
                          {timeframeLabel(alert.timeframe)}
                          {' - '}
                          {alert.lastNotifiedAt
                            ? `Last notified ${new Date(alert.lastNotifiedAt).toLocaleDateString()}`
                            : 'Never notified'}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(alert)}
                          aria-label="Edit alert"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit3 className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAlert(alert.id)}
                          aria-label="Delete alert"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

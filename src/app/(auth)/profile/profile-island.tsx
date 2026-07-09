'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Briefcase,
  Building2,
  DollarSign,
  Globe,
  GraduationCap,
  Lightbulb,
  MapPin,
  Paperclip,
  Save,
  Search,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { apiFetch } from '@/lib/api-client';
import { signOut, useSession } from '@/lib/auth-client';
import { ProfileResponse, ProfileUpdate, type ProfileUpdateType } from '@/lib/contracts/profile';
import {
  ResumeAnalysisResponse,
  type ResumeAnalysisResponseType,
} from '@/lib/contracts/resume-analysis';

export function ProfileIsland() {
  const { data: session, isPending } = useSession();
  const [loading, setLoading] = useState(true);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysisResponseType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileUpdateType>({
    resolver: zodResolver(ProfileUpdate),
    defaultValues: {
      name: '',
      university: '',
      graduationYear: undefined,
      jobKeywords: '',
      resumeText: '',
      major: '',
      gpa: undefined,
      skills: '',
      targetRoles: '',
      targetLocations: '',
      salaryExpectations: undefined,
      sponsorshipRequired: false,
    },
  });

  useEffect(() => {
    if (!session?.user) return;
    apiFetch('/api/users/profile', { schema: ProfileResponse })
      .then((data) => {
        setResumeFileName(data.resumeText ? '(resume uploaded)' : null);
        form.reset({
          name: data.name ?? '',
          university: data.university ?? '',
          graduationYear: data.graduationYear ?? undefined,
          jobKeywords: data.jobKeywords ?? '',
          resumeText: data.resumeText ?? '',
          major: data.major ?? '',
          gpa: data.gpa ?? undefined,
          skills: data.skills ?? '',
          targetRoles: data.targetRoles ?? '',
          targetLocations: data.targetLocations ?? '',
          salaryExpectations: data.salaryExpectations ?? undefined,
          sponsorshipRequired: data.sponsorshipRequired ?? false,
        });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [session, form]);

  async function handleResumeFile(file: File) {
    setUploadingResume(true);
    try {
      // Upload the file
      const uploadForm = new FormData();
      uploadForm.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadForm,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }

      const uploadBody = (await uploadRes.json()) as { url?: string | null; text?: string };

      let extractedText = uploadBody.text ?? '';
      if (!extractedText && uploadBody.url) {
        const extractionRes = await fetch('/api/upload/extract', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ fileUrl: uploadBody.url }),
        });

        if (extractionRes.ok) {
          const { text } = await extractionRes.json();
          extractedText = text;
        }
      }

      setResumeFileName(file.name);
      form.setValue('resumeText', extractedText, { shouldDirty: true });
      toast.success('Resume uploaded and text extracted');
      if (extractedText.trim().length > 80) {
        await analyzeResume(extractedText);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  }

  function onSubmit(data: ProfileUpdateType) {
    apiFetch('/api/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
      schema: ProfileResponse,
    })
      .then(() => toast.success('Profile saved'))
      .catch(() => toast.error('Failed to save profile'));
  }

  async function analyzeResume(resumeTextOverride?: string) {
    const resumeText = (resumeTextOverride ?? form.getValues('resumeText') ?? '').trim();
    if (resumeText.length < 80) {
      toast.error('Upload a resume or add more resume text first.');
      return;
    }

    setAnalyzingResume(true);
    try {
      const res = await fetch('/api/resume/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      });
      const body = (await res.json().catch(() => ({}))) as
        | ResumeAnalysisResponseType
        | { error?: string };
      if (!res.ok || 'error' in body) {
        throw new Error('error' in body ? body.error : 'Could not analyze resume');
      }
      const analysis = ResumeAnalysisResponse.parse(body);
      setResumeAnalysis(analysis);
      toast.success('Resume analysis ready');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not analyze resume');
    } finally {
      setAnalyzingResume(false);
    }
  }

  if (isPending || loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading profile…</p>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-gutter py-section">
        <Card className="w-full max-w-md shadow-brand border border-border/60 bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-h4">Not signed in</CardTitle>
            <CardDescription>Sign in to view your profile</CardDescription>
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

  const initials = (session.user.name ?? session.user.email ?? '?').charAt(0).toUpperCase();

  return (
    <main className="min-h-dvh px-gutter py-section bg-[var(--background)]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-20%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[var(--brand-100)] opacity-30 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[var(--brand-200)] opacity-20 blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto space-y-6">
        {/* Avatar + identity header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[var(--brand-200)] flex items-center justify-center text-2xl font-bold text-brand-700 select-none">
            {initials}
          </div>
          <div>
            <h1 className="text-h3 font-bold text-foreground">{session.user.name ?? 'Intern'}</h1>
            <p className="text-muted-foreground text-body">{session.user.email}</p>
          </div>
        </div>

        <Separator />

        {/* Resume Upload Card */}
        <Card className="shadow-brand border border-border/60 bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-h4 flex items-center gap-2">
              <Paperclip className="size-4 text-brand-500" />
              Resume
            </CardTitle>
            <CardDescription>
              Upload a PDF or DOCX - we&apos;ll extract the text automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleResumeFile(file);
              }}
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingResume}
              >
                <Paperclip className="size-4 mr-1.5" />
                {uploadingResume ? 'Uploading…' : resumeFileName ? 'Replace resume' : 'Choose file'}
              </Button>
              {resumeFileName && (
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {resumeFileName}
                </span>
              )}
            </div>
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => analyzeResume()}
                disabled={analyzingResume || uploadingResume}
              >
                <Sparkles className="size-4 mr-1.5" />
                {analyzingResume ? 'Analyzing...' : 'Analyze resume'}
              </Button>
            </div>
            {/* Hidden field to carry resumeText in the form submit */}
            <FormField
              control={form.control}
              name="resumeText"
              render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />}
            />
          </CardContent>
        </Card>

        {resumeAnalysis && (
          <Card className="shadow-brand border border-border/60 bg-card/95 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-h4 flex items-center gap-2">
                <Lightbulb className="size-4 text-brand-500" />
                Resume score and recommendations
              </CardTitle>
              <CardDescription>
                {resumeAnalysis.source === 'ai'
                  ? 'AI analysis based on your uploaded resume'
                  : 'Resume analysis based on detected structure and keywords'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <div className="flex items-center gap-4">
                <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-brand-200 bg-brand-50 text-2xl font-bold text-brand-700">
                  {resumeAnalysis.score}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {resumeAnalysis.summary}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Strengths</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {resumeAnalysis.strengths.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Improve next</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {resumeAnalysis.improvements.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {resumeAnalysis.rewrites.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Suggested bullet changes</p>
                  {resumeAnalysis.rewrites.slice(0, 3).map((rewrite, index) => (
                    <div
                      key={`${rewrite.before}-${index}`}
                      className="rounded-lg border border-border/70 p-3 text-sm"
                    >
                      <p className="text-muted-foreground line-through">{rewrite.before}</p>
                      <p className="mt-2 font-medium text-foreground">{rewrite.after}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{rewrite.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {resumeAnalysis.recommendedSearches.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    Recommended internship searches
                  </p>
                  <div className="grid gap-2">
                    {resumeAnalysis.recommendedSearches.slice(0, 5).map((rec) => (
                      <Link
                        key={`${rec.title}-${rec.query}`}
                        href={`/search?q=${encodeURIComponent(rec.query)}`}
                        className="rounded-lg border border-border/70 p-3 text-sm transition-colors hover:border-brand-300 hover:bg-brand-50"
                      >
                        <span className="font-medium text-foreground">{rec.title}</span>
                        <span className="mt-1 block text-muted-foreground">{rec.reason}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Academic Info Card */}
        <Card className="shadow-brand border border-border/60 bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-h4 flex items-center gap-2">
              <GraduationCap className="size-4 text-brand-500" />
              Academic info
            </CardTitle>
            <CardDescription>Your university and field of study</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <FormField
                  control={form.control}
                  name="major"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        Major
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Computer Science"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gpa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <GraduationCap className="size-3.5 text-muted-foreground" />
                        GPA
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={4}
                          placeholder="e.g. 3.75"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Search className="size-3.5 text-muted-foreground" />
                        Skills
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Python, React, SQL (comma-separated)"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Save className="size-4 mr-1.5" />
                    Save profile
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Career Preferences Card */}
        <Card className="shadow-brand border border-border/60 bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-h4 flex items-center gap-2">
              <Briefcase className="size-4 text-brand-500" />
              Career preferences
            </CardTitle>
            <CardDescription>
              Where you want to work and what you&apos;re looking for
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Form {...form}>
              <form id="career-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <FormField
                  control={form.control}
                  name="targetRoles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Briefcase className="size-3.5 text-muted-foreground" />
                        Target roles
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Frontend Engineer, Data Analyst"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetLocations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-muted-foreground" />
                        Target locations
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. New York, San Francisco, Remote"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salaryExpectations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <DollarSign className="size-3.5 text-muted-foreground" />
                        Salary expectations (USD)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={1000}
                          placeholder="e.g. 80000"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sponsorshipRequired"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-1.5 cursor-pointer">
                          <Globe className="size-3.5 text-muted-foreground" />
                          Sponsorship required
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Do you need visa sponsorship to work in the US?
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-between items-center pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      await signOut();
                      window.location.assign('/');
                    }}
                  >
                    Sign out
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    <Save className="size-4 mr-1.5" />
                    Save preferences
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

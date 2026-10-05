'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, KeyRound, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { Controller, useFieldArray, useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingStatus } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateClientMutation,
  useResetClientPasswordMutation,
  useUpdateClientMutation,
} from '@/entities/client/api/client.mutations';
import { useClientsQuery } from '@/entities/client/api/client.queries';
import type {
  ClientCredentials,
  ClientSpecialDay,
  WorkerClient,
} from '@/entities/client/model/types';
import {
  createClientSchema,
  specialDaySchema,
  type CreateClientFormInput,
  type CreateClientFormValues,
  type SpecialDayFormInput,
  type SpecialDayFormValues,
} from '@/features/clients/model/schemas';
import { getApiErrorMessage } from '@/shared/api/http-client';
import { getWeekdayLabel, WEEKDAY_OPTIONS } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';

export function ClientsScreen() {
  const clientsQuery = useClientsQuery();
  const clients = clientsQuery.data ?? [];
  const [search, setSearch] = React.useState('');
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null);
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase().trim()),
  );
  const selectedClient =
    clients.find((client) => client.id === selectedClientId) ?? filteredClients[0] ?? clients[0];

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6"
      aria-busy={clientsQuery.isPending}
    >
      <LoadingStatus active={clientsQuery.isPending} label="Загружаем клиентов…" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Клиенты</p>
          <h1 className="text-2xl font-semibold tracking-normal">Список и карточки</h1>
        </div>
        <AddClientDialog onCreated={(client) => setSelectedClientId(client.id)} />
      </div>

      {clientsQuery.isError && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {getApiErrorMessage(clientsQuery.error)}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Поиск"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <ClientList
            clients={filteredClients}
            isLoading={clientsQuery.isPending}
            selectedClientId={selectedClient?.id ?? null}
            onSelect={setSelectedClientId}
          />
        </div>

        {selectedClient ? (
          <ClientDetails client={selectedClient} />
        ) : (
          <EmptyClientDetails isLoading={clientsQuery.isPending} />
        )}
      </div>
    </section>
  );
}

function ClientList({
  clients,
  isLoading,
  selectedClientId,
  onSelect,
}: {
  clients: WorkerClient[];
  isLoading: boolean;
  selectedClientId: string | null;
  onSelect: (clientId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-3">
            <Skeleton className="mb-4 h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
        <p className="font-medium">Клиентов пока нет</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Создай первого клиента через кнопку выше.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {clients.map((client) => {
        const isSelected = selectedClientId === client.id;

        return (
          <button
            key={client.id}
            type="button"
            className={cn(
              'w-full rounded-lg border bg-card p-3 text-left transition-colors',
              isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
            )}
            onClick={() => onSelect(client.id)}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-semibold">{client.name}</p>
              {!client.isInitialPasswordChanged && (
                <Badge variant="warning">временный доступ</Badge>
              )}
            </div>
            <p className="mt-2 text-sm font-medium">
              {formatMoney(client.regularRate)} / {formatOptionalMoney(client.weekendRate)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function ClientDetails({ client }: { client: WorkerClient }) {
  const resetPasswordMutation = useResetClientPasswordMutation();
  const [resetCredentials, setResetCredentials] = React.useState<{
    clientId: string;
    credentials: ClientCredentials;
  } | null>(null);
  const currentResetCredentials =
    resetCredentials?.clientId === client.id ? resetCredentials.credentials : null;

  const resetPassword = async () => {
    try {
      const response = await resetPasswordMutation.mutateAsync(client.id);
      setResetCredentials({
        clientId: client.id,
        credentials: response.credentials,
      });
    } catch {
      setResetCredentials(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{client.name}</h2>
            <p className="text-sm text-muted-foreground">
              {client.isActive ? 'Активный клиент' : 'Неактивный клиент'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <EditClientDialog client={client} />
            <Button
              variant="outline"
              size="sm"
              loading={resetPasswordMutation.isPending}
              onClick={resetPassword}
            >
              <KeyRound />
              {resetPasswordMutation.isPending ? 'Сбрасываем...' : 'Сбросить пароль'}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Будний день</p>
            <p className="mt-1 text-2xl font-semibold">{formatMoney(client.regularRate)}</p>
            <p className="text-sm text-muted-foreground">за 1 час</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Выходной / праздник</p>
            <p className="mt-1 text-2xl font-semibold">{formatOptionalMoney(client.weekendRate)}</p>
            <p className="text-sm text-muted-foreground">за 1 час</p>
          </CardContent>
        </Card>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <h3 className="font-semibold">Особые дни</h3>
          </div>
          <SpecialDayDialog client={client} />
        </div>
        {client.specialDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Не заданы. Ставка считается по будням и выходным.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {client.specialDays.map((specialDay) => (
              <li
                key={specialDay.weekday}
                className="flex items-center gap-2 py-2 text-sm first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{getWeekdayLabel(specialDay.weekday)}</p>
                  <p className="text-muted-foreground">{formatMoney(specialDay.rate)} за 1 час</p>
                </div>
                <SpecialDayDialog client={client} specialDay={specialDay} />
                <DeleteSpecialDayDialog client={client} specialDay={specialDay} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h3 className="font-semibold">Доступ клиента</h3>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Логин и пароль показываются только после создания клиента или сброса пароля.
        </p>
        <div className="mt-3">
          <Badge variant={client.isInitialPasswordChanged ? 'success' : 'warning'}>
            {client.isInitialPasswordChanged
              ? 'Клиент сменил пароль'
              : 'Клиент ещё использует временный пароль'}
          </Badge>
        </div>

        {resetPasswordMutation.error && (
          <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {getApiErrorMessage(resetPasswordMutation.error)}
          </p>
        )}

        {currentResetCredentials && (
          <CredentialsPanel credentials={currentResetCredentials} className="mt-3" />
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-2 font-semibold">Комментарий</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          {client.notes || 'Комментарий пока не указан.'}
        </p>
      </section>
    </div>
  );
}

function EmptyClientDetails({ isLoading }: { isLoading: boolean }) {
  if (isLoading) {
    return <ClientDetailsSkeleton />;
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center">
      <p className="font-medium">Выбери клиента</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Здесь появятся ставки, контакты и доступы клиента.
      </p>
    </div>
  );
}

/** Заглушка карточки клиента: шапка и две ставки, как у ClientDetails. */
function ClientDetailsSkeleton() {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-28" />
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-14" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AddClientDialog({ onCreated }: { onCreated: (client: WorkerClient) => void }) {
  const [open, setOpen] = React.useState(false);
  const [credentials, setCredentials] = React.useState<ClientCredentials | null>(null);
  const createClientMutation = useCreateClientMutation();
  const form = useForm<CreateClientFormInput, unknown, CreateClientFormValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: '',
      regularRate: 1500,
      weekendRate: 2000,
      specialDays: [],
      notes: '',
    },
  });

  const submit = async (values: CreateClientFormValues) => {
    try {
      const response = await createClientMutation.mutateAsync({
        name: values.name,
        regularRate: toRateString(values.regularRate),
        weekendRate: values.weekendRate ? toRateString(values.weekendRate) : null,
        specialDays: toSpecialDaysPayload(values.specialDays),
        notes: values.notes || null,
      });

      setCredentials(response.credentials);
      onCreated(response.client);
      form.reset();
    } catch {
      setCredentials(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setCredentials(null);
          createClientMutation.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Добавить
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый клиент</DialogTitle>
          <DialogDescription>После создания будет показан временный доступ.</DialogDescription>
        </DialogHeader>

        {credentials ? (
          <div className="space-y-4">
            <CredentialsPanel credentials={credentials} />
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Готово</Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <div className="space-y-2">
              <Label htmlFor="client-name">Имя</Label>
              <Input id="client-name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="regular-rate">Будни</Label>
                <Input id="regular-rate" type="number" {...form.register('regularRate')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekend-rate">Выходные</Label>
                <Input id="weekend-rate" type="number" {...form.register('weekendRate')} />
              </div>
            </div>

            <SpecialDaysFields form={form} idPrefix="special-day" />

            <div className="space-y-2">
              <Label htmlFor="client-notes">Комментарий</Label>
              <Textarea id="client-notes" {...form.register('notes')} />
            </div>

            {createClientMutation.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {getApiErrorMessage(createClientMutation.error)}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" loading={createClientMutation.isPending}>
                {createClientMutation.isPending ? 'Создаём...' : 'Создать клиента'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditClientDialog({ client }: { client: WorkerClient }) {
  const [open, setOpen] = React.useState(false);
  const updateClientMutation = useUpdateClientMutation();
  const form = useForm<CreateClientFormInput, unknown, CreateClientFormValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: getClientFormDefaults(client),
  });

  React.useEffect(() => {
    if (open) {
      form.reset(getClientFormDefaults(client));
    }
  }, [client, form, open]);

  const submit = async (values: CreateClientFormValues) => {
    try {
      await updateClientMutation.mutateAsync({
        clientId: client.id,
        payload: {
          name: values.name,
          regularRate: toRateString(values.regularRate),
          weekendRate: values.weekendRate ? toRateString(values.weekendRate) : null,
          specialDays: toSpecialDaysPayload(values.specialDays),
          notes: values.notes || null,
        },
      });
      setOpen(false);
    } catch {
      // Error is rendered from mutation state.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          updateClientMutation.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil />
          Изменить
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Изменить клиента</DialogTitle>
          <DialogDescription>Новые ставки будут применяться к следующим сменам.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <div className="space-y-2">
            <Label htmlFor="edit-client-name">Имя</Label>
            <Input id="edit-client-name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-regular-rate">Будни</Label>
              <Input id="edit-regular-rate" type="number" {...form.register('regularRate')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-weekend-rate">Выходные</Label>
              <Input id="edit-weekend-rate" type="number" {...form.register('weekendRate')} />
            </div>
          </div>

          <SpecialDaysFields form={form} idPrefix="edit-special-day" />

          <div className="space-y-2">
            <Label htmlFor="edit-client-notes">Комментарий</Label>
            <Textarea id="edit-client-notes" {...form.register('notes')} />
          </div>

          {updateClientMutation.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {getApiErrorMessage(updateClientMutation.error)}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" loading={updateClientMutation.isPending}>
              {updateClientMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Без specialDay — добавление нового дня, со specialDay — изменение этого дня. */
function SpecialDayDialog({
  client,
  specialDay,
}: {
  client: WorkerClient;
  specialDay?: ClientSpecialDay;
}) {
  const [open, setOpen] = React.useState(false);
  const updateClientMutation = useUpdateClientMutation();
  const isEdit = specialDay !== undefined;
  const otherSpecialDays = client.specialDays.filter(
    (item) => item.weekday !== specialDay?.weekday,
  );
  const usedWeekdays = new Set(otherSpecialDays.map((item) => item.weekday));
  const freeWeekdays = WEEKDAY_OPTIONS.filter((option) => !usedWeekdays.has(option.value));
  const getDefaults = (): SpecialDayFormInput => ({
    weekday: specialDay?.weekday ?? freeWeekdays[0]?.value ?? 1,
    rate: specialDay?.rate ?? client.regularRate,
  });
  const form = useForm<SpecialDayFormInput, unknown, SpecialDayFormValues>({
    resolver: zodResolver(specialDaySchema),
    defaultValues: getDefaults(),
  });

  React.useEffect(() => {
    if (open) {
      form.reset(getDefaults());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (values: SpecialDayFormValues) => {
    try {
      await updateClientMutation.mutateAsync({
        clientId: client.id,
        payload: {
          specialDays: toSpecialDaysPayload([...otherSpecialDays, values]),
        },
      });
      setOpen(false);
    } catch {
      // Error is rendered from mutation state.
    }
  };

  const rateInputId = `special-day-rate-${specialDay?.weekday ?? 'new'}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          updateClientMutation.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button
            size="icon"
            variant="ghost"
            className="size-11"
            title={`Изменить: ${getWeekdayLabel(specialDay.weekday)}`}
          >
            <Pencil />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={freeWeekdays.length === 0}
            title={freeWeekdays.length === 0 ? 'Все дни недели уже заданы' : undefined}
          >
            <Plus />
            Добавить
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Изменить особый день' : 'Особый день'}</DialogTitle>
          <DialogDescription>
            Цена за час в этот день недели будет важнее ставок будней, выходных и праздников.
            Применяется к следующим сменам.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>День недели</Label>
              <Controller
                control={form.control}
                name="weekday"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {freeWeekdays.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={rateInputId}>Цена за час</Label>
              <Input
                id={rateInputId}
                type="number"
                inputMode="decimal"
                {...form.register('rate')}
              />
              {form.formState.errors.rate && (
                <p className="text-xs text-destructive">{form.formState.errors.rate.message}</p>
              )}
            </div>
          </div>

          {updateClientMutation.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {getApiErrorMessage(updateClientMutation.error)}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" loading={updateClientMutation.isPending}>
              {updateClientMutation.isPending ? 'Сохраняем...' : isEdit ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSpecialDayDialog({
  client,
  specialDay,
}: {
  client: WorkerClient;
  specialDay: ClientSpecialDay;
}) {
  const [open, setOpen] = React.useState(false);
  const updateClientMutation = useUpdateClientMutation();
  const weekdayLabel = getWeekdayLabel(specialDay.weekday);
  const isPending = updateClientMutation.isPending;

  const deleteSpecialDay = async () => {
    try {
      await updateClientMutation.mutateAsync({
        clientId: client.id,
        payload: {
          specialDays: toSpecialDaysPayload(
            client.specialDays.filter((item) => item.weekday !== specialDay.weekday),
          ),
        },
      });
      setOpen(false);
    } catch {
      // Error is rendered from mutation state.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          updateClientMutation.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-11"
          title={`Удалить: ${weekdayLabel}`}
          disabled={isPending}
        >
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Удалить особый день?</DialogTitle>
          <DialogDescription>
            {weekdayLabel}, {formatMoney(specialDay.rate)} за 1 час. Новые смены в этот день пойдут
            по ставке будней или выходных, прошлые не изменятся.
          </DialogDescription>
        </DialogHeader>

        {updateClientMutation.error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {getApiErrorMessage(updateClientMutation.error)}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            loading={isPending}
            onClick={() => void deleteSpecialDay()}
          >
            {isPending ? 'Удаляем...' : 'Удалить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SpecialDaysFields({
  form,
  idPrefix,
}: {
  form: UseFormReturn<CreateClientFormInput, unknown, CreateClientFormValues>;
  idPrefix: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'specialDays',
  });
  const specialDays = useWatch({ control: form.control, name: 'specialDays' }) ?? [];
  const usedWeekdays = new Set(specialDays.map((specialDay) => Number(specialDay.weekday)));
  const freeWeekday = WEEKDAY_OPTIONS.find((option) => !usedWeekdays.has(option.value));
  const errors = form.formState.errors.specialDays;

  const addSpecialDay = () => {
    if (!freeWeekday) {
      return;
    }

    append({
      weekday: freeWeekday.value,
      rate: form.getValues('regularRate') ?? '',
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>Особые дни</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!freeWeekday}
          onClick={addSpecialDay}
        >
          <Plus />
          Добавить день
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Своя цена за час в выбранный день недели. Важнее ставок будней, выходных и праздников.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-1">
              <div className="grid grid-cols-[1fr_7rem_auto] gap-2">
                <Controller
                  control={form.control}
                  name={`specialDays.${index}.weekday`}
                  render={({ field: weekdayField }) => (
                    <Select
                      value={String(weekdayField.value)}
                      onValueChange={(value) => weekdayField.onChange(Number(value))}
                    >
                      <SelectTrigger aria-label="День недели">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKDAY_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={String(option.value)}
                            disabled={
                              usedWeekdays.has(option.value) &&
                              Number(weekdayField.value) !== option.value
                            }
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Input
                  id={`${idPrefix}-rate-${index}`}
                  type="number"
                  aria-label="Ставка за час"
                  {...form.register(`specialDays.${index}.rate`)}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  title="Удалить особый день"
                  onClick={() => remove(index)}
                >
                  <Trash2 />
                </Button>
              </div>
              {(errors?.[index]?.weekday || errors?.[index]?.rate) && (
                <p className="text-xs text-destructive">
                  {errors[index]?.weekday?.message ?? errors[index]?.rate?.message}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CredentialsPanel({
  credentials,
  className,
}: {
  credentials: ClientCredentials;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-primary/25 bg-primary/5 p-4', className)}>
      <p className="text-sm font-medium text-muted-foreground">Логин</p>
      <p className="mt-1 font-mono text-lg font-semibold">{credentials.login}</p>
      <p className="mt-4 text-sm font-medium text-muted-foreground">Пароль</p>
      <p className="mt-1 font-mono text-lg font-semibold">{credentials.password}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        Пароль показывается один раз. После закрытия окна его можно только сбросить.
      </p>
    </div>
  );
}

function toRateString(value: number) {
  return value.toFixed(2);
}

function toSpecialDaysPayload(specialDays: CreateClientFormValues['specialDays']) {
  return specialDays.map((specialDay) => ({
    weekday: specialDay.weekday,
    rate: toRateString(specialDay.rate),
  }));
}

function getClientFormDefaults(client: WorkerClient): CreateClientFormValues {
  return {
    name: client.name,
    regularRate: client.regularRate,
    weekendRate: client.weekendRate ?? undefined,
    specialDays: client.specialDays.map((specialDay) => ({ ...specialDay })),
    notes: client.notes ?? '',
  };
}

function formatOptionalMoney(value: number | null) {
  return value === null ? 'не задано' : formatMoney(value);
}

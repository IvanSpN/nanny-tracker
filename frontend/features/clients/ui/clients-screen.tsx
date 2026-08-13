'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Pencil, Plus, Search, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateClientMutation,
  useResetClientPasswordMutation,
  useUpdateClientMutation,
} from '@/entities/client/api/client.mutations';
import { useClientsQuery } from '@/entities/client/api/client.queries';
import type { ClientCredentials, WorkerClient } from '@/entities/client/model/types';
import {
  createClientSchema,
  type CreateClientFormInput,
  type CreateClientFormValues,
} from '@/features/clients/model/schemas';
import { getApiErrorMessage } from '@/shared/api/http-client';
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
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
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
            isLoading={clientsQuery.isLoading}
            selectedClientId={selectedClient?.id ?? null}
            onSelect={setSelectedClientId}
          />
        </div>

        {selectedClient ? (
          <ClientDetails client={selectedClient} />
        ) : (
          <EmptyClientDetails isLoading={clientsQuery.isLoading} />
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
          <div key={index} className="h-24 rounded-lg border border-border bg-card p-3">
            <div className="mb-3 h-4 w-2/3 rounded-md bg-muted" />
            <div className="h-3 w-1/2 rounded-md bg-muted" />
            <div className="mt-4 h-3 w-1/3 rounded-md bg-muted" />
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
              disabled={resetPasswordMutation.isPending}
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
  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center">
      <p className="font-medium">{isLoading ? 'Загружаем клиентов...' : 'Выбери клиента'}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Здесь появятся ставки, контакты и доступы клиента.
      </p>
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
      notes: '',
    },
  });

  const submit = async (values: CreateClientFormValues) => {
    try {
      const response = await createClientMutation.mutateAsync({
        name: values.name,
        regularRate: toRateString(values.regularRate),
        weekendRate: values.weekendRate ? toRateString(values.weekendRate) : null,
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
      <DialogContent className="bottom-0 top-auto w-full max-w-none translate-y-0 rounded-b-none sm:bottom-auto sm:top-1/2 sm:max-w-lg sm:-translate-y-1/2 sm:rounded-lg">
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
              <Button type="submit" disabled={createClientMutation.isPending}>
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
      <DialogContent className="bottom-0 top-auto w-full max-w-none translate-y-0 rounded-b-none sm:bottom-auto sm:top-1/2 sm:max-w-lg sm:-translate-y-1/2 sm:rounded-lg">
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
            <Button type="submit" disabled={updateClientMutation.isPending}>
              {updateClientMutation.isPending ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

function getClientFormDefaults(client: WorkerClient): CreateClientFormValues {
  return {
    name: client.name,
    regularRate: client.regularRate,
    weekendRate: client.weekendRate ?? undefined,
    notes: client.notes ?? '',
  };
}

function formatOptionalMoney(value: number | null) {
  return value === null ? 'не задано' : formatMoney(value);
}

'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, MapPin, Phone, Plus, Search, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { queryKeys } from '@/shared/api/query-keys';
import { formatMoney } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';
import { getWorkerDashboard } from '@/shared/mock/api';
import { mockDashboard } from '@/shared/mock/dashboard';
import type { Client } from '@/shared/types/domain';

const addClientSchema = z.object({
  name: z.string().min(2, 'Укажите имя'),
  phone: z.string().min(3, 'Укажите телефон'),
  address: z.string().min(3, 'Укажите адрес'),
  regularRate: z.coerce.number().positive(),
  weekendRate: z.coerce.number().positive(),
  notes: z.string().optional(),
});

type AddClientInput = z.input<typeof addClientSchema>;
type AddClientValues = z.output<typeof addClientSchema>;

type CreatedCredentials = {
  login: string;
  password: string;
};

export function ClientsScreen() {
  const { data = mockDashboard } = useQuery({
    queryKey: queryKeys.worker.dashboard,
    queryFn: getWorkerDashboard,
  });
  const [localClients, setLocalClients] = React.useState<Client[]>([]);
  const [search, setSearch] = React.useState('');
  const clients = React.useMemo(
    () => [...localClients, ...data.clients],
    [data.clients, localClients],
  );
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase().trim()),
  );
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(
    data.clients[0]?.id ?? null,
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
        <AddClientDialog
          onAddClient={(client) => {
            setLocalClients((current) => [client, ...current]);
            setSelectedClientId(client.id);
          }}
        />
      </div>

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

          <div className="space-y-2">
            {filteredClients.map((client) => {
              const isSelected = selectedClient?.id === client.id;

              return (
                <button
                  key={client.id}
                  type="button"
                  className={cn(
                    'w-full rounded-lg border bg-card p-3 text-left transition-colors',
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
                  )}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-semibold">{client.name}</p>
                    <Badge variant={client.credentialsStatus === 'changed' ? 'success' : 'warning'}>
                      {client.credentialsStatus === 'changed' ? 'пароль изменён' : 'первичный'}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{client.phone}</p>
                  <p className="mt-2 text-sm font-medium">
                    {formatMoney(client.regularRate)} / {formatMoney(client.weekendRate)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {selectedClient && <ClientDetails client={selectedClient} />}
      </div>
    </section>
  );
}

function ClientDetails({ client }: { client: Client }) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{client.name}</h2>
            <p className="text-sm text-muted-foreground">Активный клиент</p>
          </div>
          <Button variant="outline" size="sm">
            <KeyRound />
            Сбросить пароль
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoLine icon={Phone} label="Телефон" value={client.phone} />
          <InfoLine icon={MapPin} label="Адрес" value={client.address} />
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
            <p className="mt-1 text-2xl font-semibold">{formatMoney(client.weekendRate)}</p>
            <p className="text-sm text-muted-foreground">за 1 час</p>
          </CardContent>
        </Card>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h3 className="font-semibold">Доступ клиента</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={client.credentialsStatus === 'changed' ? 'success' : 'warning'}>
            {client.credentialsStatus === 'changed'
              ? 'Клиент сменил первичный пароль'
              : 'Клиент ещё не сменил первичный пароль'}
          </Badge>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-2 font-semibold">Комментарий</h3>
        <p className="text-sm leading-6 text-muted-foreground">{client.notes}</p>
      </section>
    </div>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-muted p-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function AddClientDialog({ onAddClient }: { onAddClient: (client: Client) => void }) {
  const [open, setOpen] = React.useState(false);
  const [credentials, setCredentials] = React.useState<CreatedCredentials | null>(null);
  const form = useForm<AddClientInput, unknown, AddClientValues>({
    resolver: zodResolver(addClientSchema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      regularRate: 1500,
      weekendRate: 2000,
      notes: '',
    },
  });

  const submit = (values: AddClientValues) => {
    const client: Client = {
      id: `local-client-${crypto.randomUUID()}`,
      name: values.name,
      phone: values.phone,
      address: values.address,
      regularRate: values.regularRate,
      weekendRate: values.weekendRate,
      notes: values.notes ?? '',
      isActive: true,
      credentialsStatus: 'initial',
    };
    const nextCredentials = {
      login: `client_${client.id.replaceAll('-', '').slice(-8)}`,
      password: 'Nanny7429',
    };

    onAddClient(client);
    setCredentials(nextCredentials);
    form.reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setCredentials(null);
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
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
              <p className="text-sm font-medium text-muted-foreground">Логин</p>
              <p className="mt-1 font-mono text-lg font-semibold">{credentials.login}</p>
              <p className="mt-4 text-sm font-medium text-muted-foreground">Пароль</p>
              <p className="mt-1 font-mono text-lg font-semibold">{credentials.password}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Готово</Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-name">Имя</Label>
                <Input id="client-name" {...form.register('name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Телефон</Label>
                <Input id="client-phone" {...form.register('phone')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-address">Адрес</Label>
              <Input id="client-address" {...form.register('address')} />
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

            <DialogFooter>
              <Button type="submit">Создать клиента</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, HeartHandshake, LockKeyhole, UserRoundPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLoginMutation, useRegisterWorkerMutation } from '@/features/auth/api/auth.mutations';
import {
  loginSchema,
  registerWorkerSchema,
  type LoginFormValues,
  type RegisterWorkerFormValues,
} from '@/features/auth/model/schemas';
import { getApiErrorMessage } from '@/shared/api/http-client';

export function AuthScreen() {
  const loginMutation = useLoginMutation();
  const registerWorkerMutation = useRegisterWorkerMutation();
  const isPending = loginMutation.isPending || registerWorkerMutation.isPending;

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterWorkerFormValues>({
    resolver: zodResolver(registerWorkerSchema),
    defaultValues: {
      name: 'Айгуль',
      email: 'aigul@example.com',
      login: 'aigul_worker',
      password: 'password',
      phone: '',
    },
  });

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <HeartHandshake className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Nanny Work Tracker</p>
            <h1 className="text-2xl font-semibold tracking-normal">Рабочее время и клиенты</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Вход</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="gap-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Войти</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form
                  className="space-y-4"
                  onSubmit={loginForm.handleSubmit((values) => loginMutation.mutate(values))}
                >
                  <div className="space-y-2">
                    <Label htmlFor="login">Логин</Label>
                    <Input
                      id="login"
                      placeholder="Введите логин"
                      {...loginForm.register('login')}
                    />
                    {loginForm.formState.errors.login && (
                      <p className="text-xs text-destructive">
                        {loginForm.formState.errors.login.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Пароль</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Введите пароль"
                      {...loginForm.register('password')}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  {loginMutation.error && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {getApiErrorMessage(loginMutation.error)}
                    </p>
                  )}

                  <Button className="w-full" type="submit" disabled={isPending}>
                    <LockKeyhole />
                    {loginMutation.isPending ? 'Входим...' : 'Войти'}
                    <ArrowRight />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form
                  className="space-y-4"
                  onSubmit={registerForm.handleSubmit((values) =>
                    registerWorkerMutation.mutate({
                      ...values,
                      phone: values.phone || undefined,
                    }),
                  )}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Имя</Label>
                      <Input id="name" {...registerForm.register('name')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-login">Логин</Label>
                      <Input id="register-login" {...registerForm.register('login')} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...registerForm.register('email')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Телефон</Label>
                    <Input id="phone" {...registerForm.register('phone')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Пароль</Label>
                    <Input
                      id="register-password"
                      type="password"
                      {...registerForm.register('password')}
                    />
                  </div>

                  {registerWorkerMutation.error && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {getApiErrorMessage(registerWorkerMutation.error)}
                    </p>
                  )}

                  <Button className="w-full" type="submit" disabled={isPending}>
                    <UserRoundPlus />
                    {registerWorkerMutation.isPending ? 'Создаём...' : 'Создать кабинет работника'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

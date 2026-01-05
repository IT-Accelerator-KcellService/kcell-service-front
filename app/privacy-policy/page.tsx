"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function PrivacyPolicyPage() {
  const [language, setLanguage] = useState<"ru" | "en">("ru")

  const privacyPolicyRU = {
    title: "ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ",
    appName: "Kcell Service",
    lastUpdated: "Дата последнего обновления: 05 января 2026 года",
    sections: [
      {
        title: "1. Общие положения",
        content: `Настоящая Политика конфиденциальности определяет порядок сбора, использования, хранения и защиты информации пользователей корпоративного мобильного приложения Kcell Service (далее — «Приложение»).

Приложение предназначено исключительно для внутреннего использования сотрудниками и не является публичным сервисом.

Оператором Приложения является частная компания TMK TechnoHorizon Ltd.`
      },
      {
        title: "2. Какие данные мы обрабатываем",
        content: `В рамках работы Приложения могут обрабатываться следующие категории данных:

Данные учетной записи и авторизации: служебный логин, служебный идентификатор пользователя, иные идентификаторы, необходимые для предоставления доступа в Приложение.

Данные сервисных заявок: содержание заявок, комментарии, статусы, служебные отметки и иные сведения, связанные с обработкой внутренних обращений.

Вложения: фотографии, прикрепляемые пользователями к заявкам в целях подтверждения/описания проблемы или запроса.

Информация об офисе: сведения об офисе компании, к которому относится пользователь и/или создаваемая заявка (например, для определения, в каком офисе работает сотрудник и в какой офис направляется заявка).

Технические данные: сведения, необходимые для корректной работы Приложения, включая тип устройства, версию операционной системы, технические журналы событий (при наличии), а также данные, необходимые для доставки push-уведомлений.

Приложение не осуществляет отслеживание точного местоположения пользователя, не использует GPS-данные устройства и не передает информацию о местоположении другим пользователям.

Приложение не обрабатывает платежную информацию и не использует данные пользователей для рекламных или маркетинговых целей.`
      },
      {
        title: "3. Цели обработки данных",
        content: `Данные обрабатываются исключительно для следующих целей:

предоставление доступа к функционалу Приложения и обеспечение работы учетных записей;

создание, обработка и управление внутренними сервисными заявками;

маршрутизация и распределение заявок по офисам и ответственным подразделениям;

отправка пользователям push-уведомлений о статусе заявок и изменениях по ним;

формирование внутренней отчетности и аналитики по обращениям, а также контроль качества и сроков обработки;

обеспечение безопасности, стабильности и корректной работы Приложения.`
      },
      {
        title: "4. Хранение данных и инфраструктура",
        content: `Данные Приложения хранятся и обрабатываются в облачной инфраструктуре, предоставляемой платформой Render. Серверная часть Приложения и база данных размещены в облаке и не находятся во внутренней инфраструктуре Kcell.

Доступ к данным осуществляется по защищенным каналам связи. Передача данных между Приложением и серверной частью осуществляется по протоколу HTTPS.

Оператор применяет организационные и технические меры, направленные на защиту данных, включая разграничение прав доступа и использование механизмов аутентификации.`
      },
      {
        title: "5. Передача данных третьим лицам",
        content: `Данные пользователей не передаются третьим лицам и не используются в коммерческих целях.

Использование облачной платформы Render осуществляется исключительно как технологической инфраструктуры для хранения и обработки данных. Передача данных возможна только в случаях, предусмотренных действующим законодательством.`
      },
      {
        title: "6. Доступ к Приложению",
        content: `Доступ к Приложению предоставляется только авторизованным пользователям. Регистрация пользователей через Приложение не предусмотрена. Учетные записи создаются и управляются в рамках внутренних корпоративных процедур.

Доступ внешних лиц и подрядчиков к Приложению не предусмотрен.`
      },
      {
        title: "7. Административный доступ и управление данными",
        content: `Доступ к данным Приложения имеют только уполномоченные пользователи в рамках своих служебных обязанностей, включая роли Администратор и Руководитель.

Администратор и Руководитель могут просматривать и обрабатывать сервисные заявки, включая связанные с ними данные и вложения, исключительно для выполнения рабочих функций и управления процессами.`
      },
      {
        title: "8. Сроки хранения, удаление и архивирование",
        content: `Данные, включая сервисные заявки и прикрепленные материалы, могут храниться, архивироваться или удаляться в соответствии с внутренними регламентами компании и операционными требованиями.`
      },
      {
        title: "9. Права пользователей и обращения",
        content: `Пользователь имеет право получить информацию о данных, обрабатываемых в рамках Приложения, а также обратиться по вопросам обработки и защиты данных к ответственному лицу (контакт указан ниже).`
      },
      {
        title: "10. Изменения политики",
        content: `Оператор вправе вносить изменения в настоящую Политику конфиденциальности. Актуальная версия Политики публикуется по соответствующему URL.`
      },
      {
        title: "11. Контактная информация",
        content: `По вопросам, связанным с обработкой данных и работой Приложения, можно обращаться по адресу: Bakhtybay.a@tmk-limited.com`
      }
    ]
  }

  const privacyPolicyEN = {
    title: "PRIVACY POLICY",
    appName: "Kcell Service",
    lastUpdated: "Last updated: 05 January 2026",
    sections: [
      {
        title: "1. General Provisions",
        content: `This Privacy Policy describes how information is collected, used, stored, and protected in the corporate mobile application Kcell Service (the "App").

The App is intended exclusively for internal use by employees and is not a public service.

The App is operated by TMK TechnoHorizon Ltd., a private company.`
      },
      {
        title: "2. What Data We Process",
        content: `In connection with the operation of the App, the following categories of data may be processed:

Account and authentication data: corporate login, corporate user identifier, and other identifiers required to grant access to the App.

Service request data: service request content, comments, statuses, internal tags/notes, and other information related to processing internal requests.

Attachments: photos uploaded by users and attached to service requests to describe or confirm the issue/request.

Office information: information about the company office associated with the user and/or the created request (for example, to determine which office an employee is located in and which office should receive the request).

Technical data: information required for the proper functioning of the App, including device type, operating system version, technical event logs (if applicable), and data required to deliver push notifications.

The App does not track a user's precise location, does not use the device's GPS data, and does not share location information with other users.

The App does not process payment information and does not use user data for advertising or marketing purposes.`
      },
      {
        title: "3. Purposes of Data Processing",
        content: `Data is processed solely for the following purposes:

providing access to the App functionality and supporting user accounts;

creating, processing, and managing internal service requests;

routing and assigning requests by office and responsible departments;

sending push notifications about request status updates and changes;

preparing internal reporting and analytics on requests, and monitoring quality and processing timelines;

ensuring the security, stability, and proper operation of the App.`
      },
      {
        title: "4. Data Storage and Infrastructure",
        content: `App data is stored and processed in cloud infrastructure provided by Render. The backend and database are hosted in the cloud and are not located within Kcell's internal infrastructure.

Access to data is provided via secure communication channels. Data transmission between the App and the backend is performed over HTTPS.

The operator applies organizational and technical measures aimed at protecting data, including access controls and authentication mechanisms.`
      },
      {
        title: "5. Data Sharing with Third Parties",
        content: `User data is not shared with third parties and is not used for commercial purposes.

Render is used solely as the technological infrastructure for storing and processing data. Data may be disclosed only where required by applicable law.`
      },
      {
        title: "6. Access to the App",
        content: `Access to the App is available only to authorized users. User self-registration within the App is not provided. Accounts are created and managed in accordance with internal corporate procedures.

Access for external parties and contractors is not предусмотрен. (i.e., not provided)`
      },
      {
        title: "7. Administrative Access and Data Management",
        content: `Access to App data is granted only to authorized users within the scope of their job responsibilities, including the Administrator and Manager roles.

Administrators and Managers may view and process service requests, including related data and attachments, solely to perform job functions and manage internal processes.`
      },
      {
        title: "8. Retention, Deletion, and Archiving",
        content: `Data, including service requests and attachments, may be retained, archived, or deleted in accordance with internal company policies and operational requirements.`
      },
      {
        title: "9. User Rights and Requests",
        content: `Users may request information about the data processed in the App and may contact the responsible person regarding data processing and protection (see contact details below).`
      },
      {
        title: "10. Changes to This Policy",
        content: `The operator may update this Privacy Policy. The current version of the Policy is published at the applicable URL.`
      },
      {
        title: "11. Contact Information",
        content: `For questions related to data processing and the App, please contact: Bakhtybay.a@tmk-limited.com`
      }
    ]
  }

  const policy = language === "ru" ? privacyPolicyRU : privacyPolicyEN

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-violet-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link href="/login">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === "ru" ? "Назад" : "Back"}
            </Button>
          </Link>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <Button
                  variant={language === "ru" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLanguage("ru")}
                  className={language === "ru" ? "bg-violet-600" : ""}
                >
                  RU
                </Button>
                <Button
                  variant={language === "en" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLanguage("en")}
                  className={language === "en" ? "bg-violet-600" : ""}
                >
                  EN
                </Button>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {policy.title}
            </CardTitle>
            <p className="text-lg font-semibold text-gray-700 mt-2">
              {policy.appName}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {policy.lastUpdated}
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {policy.sections.map((section, index) => (
              <div key={index} className="space-y-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  {section.title}
                </h2>
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

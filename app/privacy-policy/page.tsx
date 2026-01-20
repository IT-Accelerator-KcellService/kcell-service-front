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
    lastUpdated: "Дата последнего обновления: 20 января 2026 года",
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

Контактные данные: электронный адрес и/или номер телефона пользователя (при наличии), используемые для связи и обеспечения доступа.

Номер телефона и SMS: номер телефона может обрабатываться для связи и восстановления доступа к учетной записи. Для подтверждения личности и восстановления доступа могут использоваться одноразовые коды, отправляемые по SMS. Приложение не получает доступ к содержимому SMS-сообщений пользователя и не считывает их.

Данные сервисных заявок: содержание заявок, комментарии, статусы, служебные отметки и иные сведения, связанные с обработкой внутренних обращений.

Вложения: фотографии и/или иные материалы, которые пользователи прикрепляют к заявкам по собственной инициативе в целях подтверждения/описания проблемы или запроса. Такие вложения используются только для обработки соответствующей заявки и доступны уполномоченным сотрудникам в рамках их ролей.

Информация об офисе: сведения об офисе компании, к которому относится пользователь и/или создаваемая заявка (например, для определения, в каком офисе работает сотрудник и в какой офис направляется заявка).

Приблизительное местоположение (Location): Приложение может запрашивать приблизительное местоположение пользователя в момент создания заявки. Эти данные используются исключительно для определения офиса компании, к которому относится пользователь и/или создаваемая заявка, и для корректной маршрутизации обращений. Приложение не осуществляет сбор точного местоположения и не предоставляет информацию о местоположении другим пользователям.

Технические данные: сведения, необходимые для корректной работы Приложения, включая тип устройства, версию операционной системы, технические журналы событий (при наличии), а также данные, необходимые для доставки push-уведомлений.

Приложение не обрабатывает платежную информацию и не использует данные пользователей для рекламных или маркетинговых целей.`
      },
      {
        title: "3. Цели обработки данных",
        content: `Данные обрабатываются исключительно для следующих целей:

предоставление доступа к функционалу Приложения и обеспечение работы учетных записей;

создание, обработка и управление внутренними сервисными заявками;

маршрутизация и распределение заявок по офисам и ответственным подразделениям;

определение офиса пользователя/заявки с использованием приблизительного местоположения (при необходимости);

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
        content: `Данные пользователей не передаются третьим лицам и не используются в коммерческих целях, включая данные о приблизительном местоположении.

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
    lastUpdated: "Last updated: 20 January 2026",
    sections: [
      {
        title: "1. General Provisions",
        content: `This Privacy Policy defines the procedure for collecting, using, storing, and protecting information of users of the corporate mobile application Kcell Service (the "App").

The App is intended exclusively for internal use by employees and is not a public service.

The App operator is the private company TMK TechnoHorizon Ltd.`
      },
      {
        title: "2. Data We Process",
        content: `In the course of operating the App, the following categories of data may be processed:

Account and authentication data: corporate login, corporate user ID, and other identifiers required to provide access to the App.

Contact data: the user's email address and/or phone number (if available), used for communication and providing access.

Phone number and SMS: a phone number may be processed for communication and account access recovery. For identity verification and access recovery, one-time codes sent via SMS may be used. The App does not access, read, or collect the content of the user's SMS messages.

Service request data: the content of requests, comments, statuses, internal notes, and other information related to processing internal requests.

Attachments: photos and/or other materials that users attach to requests on their own initiative to confirm/describe an issue or request. Such attachments are used only to process the relevant request and are available to authorized employees according to their roles.

Office information: information about the company office related to the user and/or the created request (for example, to determine in which office the employee works and to which office the request is addressed).

Approximate location (Location): the App may request the user's approximate location at the time a request is created. This data is used solely to determine the company office related to the user and/or the request and to route requests correctly. The App does not collect precise location and does not provide location information to other users.

Technical data: information required for proper operation of the App, including device type, operating system version, technical event logs (if applicable), and data necessary for delivering push notifications.

The App does not process payment information and does not use user data for advertising or marketing purposes.`
      },
      {
        title: "3. Purposes of Data Processing",
        content: `Data is processed exclusively for the following purposes:

providing access to the App's functionality and maintaining user accounts;

creating, processing, and managing internal service requests;

routing and distributing requests by offices and responsible departments;

determining the user/request office using approximate location (when necessary);

sending users push notifications about request status and updates;

generating internal reporting and analytics related to requests, as well as monitoring quality and processing times;

ensuring the security, stability, and proper functioning of the App.`
      },
      {
        title: "4. Data Storage and Infrastructure",
        content: `App data is stored and processed in cloud infrastructure provided by the Render platform. The server-side components and database are hosted in the cloud and are not located within Kcell's internal infrastructure.

Access to data is provided via secure communication channels. Data transmission between the App and the server-side components uses the HTTPS protocol.

The operator applies organizational and technical measures to protect data, including access control and authentication mechanisms.`
      },
      {
        title: "5. Sharing Data with Third Parties",
        content: `User data is not shared with third parties and is not used for commercial purposes, including approximate location data.

Use of the Render cloud platform is solely as a technological infrastructure for data storage and processing. Data may be disclosed only in cases required by applicable law.`
      },
      {
        title: "6. Access to the App",
        content: `Access to the App is granted only to authorized users. User registration within the App is not available. Accounts are created and managed under internal corporate procedures.

Access for external persons and contractors is not provided.`
      },
      {
        title: "7. Administrative Access and Data Management",
        content: `Access to App data is granted only to authorized users within their job responsibilities, including the roles of Administrator and Manager (Supervisor).

Administrators and Managers may view and process service requests, including related data and attachments, solely to perform work duties and manage processes.`
      },
      {
        title: "8. Retention, Deletion, and Archiving",
        content: `Data, including service requests and attached materials, may be stored, archived, or deleted in accordance with internal company policies and operational requirements.`
      },
      {
        title: "9. User Rights and Requests",
        content: `Users have the right to obtain information about the data processed within the App and may contact the responsible person regarding data processing and protection (contact details below).`
      },
      {
        title: "10. Changes to This Policy",
        content: `The operator may amend this Privacy Policy. The current version of the Policy is published at the relevant URL.`
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

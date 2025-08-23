import os
import logging
from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, ConversationHandler
from dotenv import load_dotenv

load_dotenv()

# Состояния разговора
SURNAME, NAME, PATRONYMIC, PASSPORT, SUBJECT, SESSION_TIME, PRIVACY = range(7)

# Настройка логирования
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text(
        "Добро пожаловать! Заполните данные для записи на сессию.\n\n"
        "Введите вашу фамилию:"
    )
    return SURNAME

async def surname(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['surname'] = update.message.text
    await update.message.reply_text("Введите ваше имя:")
    return NAME

async def name(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['name'] = update.message.text
    await update.message.reply_text("Введите ваше отчество:")
    return PATRONYMIC

async def patronymic(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['patronymic'] = update.message.text
    await update.message.reply_text("Введите паспортные данные:")
    return PASSPORT

async def passport(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['passport'] = update.message.text
    await update.message.reply_text("Введите предмет:")
    return SUBJECT

async def subject(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['subject'] = update.message.text
    await update.message.reply_text("Введите дату и время сессии (в формате ДД.ММ.ГГГГ ЧЧ:ММ):")
    return SESSION_TIME

async def session_time(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['session_time'] = update.message.text
    
    keyboard = [['✅ Согласен', '❌ Не согласен']]
    reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True)
    
    await update.message.reply_text(
        "Прочитайте и согласитесь с политикой конфиденциальности:\n\n"
        "Мы обязуемся защищать ваши персональные данные...",
        reply_markup=reply_markup
    )
    return PRIVACY

async def privacy(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if update.message.text == '✅ Согласен':
        # Сохраняем данные (здесь можно добавить сохранение в базу)
        user_data = context.user_data
        
        await update.message.reply_text(
            f"✅ Заявка оформлена!\n\n"
            f"ФИО: {user_data['surname']} {user_data['name']} {user_data['patronymic']}\n"
            f"Паспорт: {user_data['passport']}\n"
            f"Предмет: {user_data['subject']}\n"
            f"Время сессии: {user_data['session_time']}\n\n"
            f"Спасибо за запись!",
            reply_markup=ReplyKeyboardRemove()
        )
        
        # Очищаем данные
        context.user_data.clear()
        return ConversationHandler.END
    else:
        await update.message.reply_text(
            "Для записи на сессию необходимо согласие с политикой конфиденциальности.",
            reply_markup=ReplyKeyboardRemove()
        )
        return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text(
        "Запись отменена.",
        reply_markup=ReplyKeyboardRemove()
    )
    context.user_data.clear()
    return ConversationHandler.END

def main() -> None:
    # Создаем Application
    application = Application.builder().token(os.getenv('TELEGRAM_BOT_TOKEN')).build()

    # Создаем ConversationHandler
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start)],
        states={
            SURNAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, surname)],
            NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, name)],
            PATRONYMIC: [MessageHandler(filters.TEXT & ~filters.COMMAND, patronymic)],
            PASSPORT: [MessageHandler(filters.TEXT & ~filters.COMMAND, passport)],
            SUBJECT: [MessageHandler(filters.TEXT & ~filters.COMMAND, subject)],
            SESSION_TIME: [MessageHandler(filters.TEXT & ~filters.COMMAND, session_time)],
            PRIVACY: [MessageHandler(filters.TEXT & ~filters.COMMAND, privacy)],
        },
        fallbacks=[CommandHandler('cancel', cancel)],
    )

    application.add_handler(conv_handler)

    # Запускаем бота
    application.run_polling()

if __name__ == '__main__':
    main()
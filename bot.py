import os
import logging
import sys
from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, ConversationHandler
from dotenv import load_dotenv

load_dotenv()

# Состояния разговора
SURNAME, NAME, PATRONYMIC, PASSPORT, SUBJECT, SESSION_TIME, PRIVACY = range(7)

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Ваш токен
TELEGRAM_TOKEN = "8007672980:AAGPSk8oTcjHt5tplFuyd90qkGRTrMAC1Hc"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text(
        "👋 Добро пожаловать! Заполните данные для записи на сессию.\n\n"
        "📝 Введите вашу фамилию:"
    )
    return SURNAME

async def surname(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['surname'] = update.message.text
    await update.message.reply_text("✅ Фамилия принята!\n\nВведите ваше имя:")
    return NAME

async def name(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['name'] = update.message.text
    await update.message.reply_text("✅ Имя принято!\n\nВведите ваше отчество:")
    return PATRONYMIC

async def patronymic(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['patronymic'] = update.message.text
    await update.message.reply_text("✅ Отчество принято!\n\nВведите паспортные данные:")
    return PASSPORT

async def passport(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['passport'] = update.message.text
    await update.message.reply_text("✅ Паспортные данные приняты!\n\nВведите предмет для сессии:")
    return SUBJECT

async def subject(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['subject'] = update.message.text
    await update.message.reply_text(
        "✅ Предмет принят!\n\n"
        "Введите дату и время сессии:\n"
        "Формат: ДД.ММ.ГГГГ ЧЧ:ММ\n"
        "Пример: 25.12.2024 14:30"
    )
    return SESSION_TIME

async def session_time(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data['session_time'] = update.message.text
    
    keyboard = [['✅ Согласен', '❌ Не согласен']]
    reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)
    
    await update.message.reply_text(
        "📋 Политика конфиденциальности:\n\n"
        "• Ваши данные защищены\n"
        "• Используются только для организации учебы\n"
        "• Не передаются третьим лицам\n\n"
        "Согласны с политикой конфиденциальности?",
        reply_markup=reply_markup
    )
    return PRIVACY

async def privacy(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if update.message.text == '✅ Согласен':
        user_data = context.user_data
        
        response_text = f"""
🎉 Заявка оформлена!

📋 Ваши данные:
├ Фамилия: {user_data['surname']}
├ Имя: {user_data['name']}
├ Отчество: {user_data['patronymic']}
├ Паспорт: {user_data['passport']}
├ Предмет: {user_data['subject']}
└ Время: {user_data['session_time']}

✅ Запись подтверждена!
Спасибо! 📚
        """
        
        await update.message.reply_text(response_text, reply_markup=ReplyKeyboardRemove())
        logger.info(f"Новая запись: {user_data}")
        context.user_data.clear()
        return ConversationHandler.END
    else:
        await update.message.reply_text(
            "❌ Для записи необходимо согласие с политикой конфиденциальности.",
            reply_markup=ReplyKeyboardRemove()
        )
        return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text(
        "❌ Запись отменена.\n\n/start - начать заново",
        reply_markup=ReplyKeyboardRemove()
    )
    context.user_data.clear()
    return ConversationHandler.END

def main():
    """Основная функция запуска бота"""
    try:
        print("🚀 Запуск Telegram бота...")
        
        application = Application.builder().token(TELEGRAM_TOKEN).build()

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
        
        print("✅ Бот запущен! Ожидание сообщений...")
        application.run_polling()
        
    except Exception as e:
        print(f"❌ Ошибка запуска бота: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
